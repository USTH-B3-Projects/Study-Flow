import json
import time
import urllib.request

import websocket


request = urllib.request.Request("http://localhost:9223/json/new?about:blank", method="PUT")
target = json.load(urllib.request.urlopen(request))
ws = websocket.create_connection(target["webSocketDebuggerUrl"])
message_id = 0


def cdp(method, params=None):
    global message_id
    message_id += 1
    ws.send(json.dumps({"id": message_id, "method": method, "params": params or {}}))
    while True:
        response = json.loads(ws.recv())
        if response.get("id") == message_id:
            assert "error" not in response, response
            return response.get("result", {})


def evaluate(expression):
    params = {"expression": expression, "returnByValue": True}
    if globals().get("runtime_context"):
        params["contextId"] = runtime_context
    response = cdp("Runtime.evaluate", params)
    assert "exceptionDetails" not in response, response
    return response["result"].get("value")


cdp("Page.enable")
cdp("Page.addScriptToEvaluateOnNewDocument", {
    "source": "localStorage.setItem('studyflow_current_user', JSON.stringify({username:'testuser', studentName:'Test User'}));"
})
cdp("Page.navigate", {"url": "http://127.0.0.1:5501/html/tasks.html"})
time.sleep(1)
ws.close()
targets = json.load(urllib.request.urlopen("http://localhost:9223/json/list"))
target = next(item for item in targets if item["url"].endswith("/html/tasks.html"))
ws = websocket.create_connection(target["webSocketDebuggerUrl"])
frame_id = cdp("Page.getFrameTree")["frameTree"]["frame"]["id"]
runtime_context = cdp("Page.createIsolatedWorld", {"frameId": frame_id})["executionContextId"]
assert evaluate("location.pathname") == "/html/tasks.html", evaluate("location.href")
evaluate("document.querySelector('#addTaskBtn').click()")
time.sleep(1)
evaluate("document.querySelector('.deadline-picker').click()")
calendar = evaluate("""(() => {
  const date = document.querySelector('.deadline-date-picker');
  const time = document.querySelector('.deadline-time-picker');
  const style = getComputedStyle(date);
  return {
    title: date.querySelector('strong').textContent,
    days: date.querySelectorAll('.deadline-calendar-day').length,
    dateOpen: !date.hidden,
    timeClosed: time.hidden,
    radius: style.borderRadius,
    background: style.backgroundColor,
    continueFullWidth: date.querySelector('[data-deadline-continue]').offsetWidth === date.querySelector('.deadline-calendar-grid').offsetWidth
  };
})()""")
assert calendar == {"title": "Select date", "days": 42, "dateOpen": True, "timeClosed": True, "radius": "14px", "background": "rgb(255, 255, 255)", "continueFullWidth": True}, calendar
evaluate("document.querySelector('.deadline-calendar-day:not(.is-outside)').click()")
assert evaluate("!document.querySelector('[data-deadline-continue]').disabled")
evaluate("document.querySelector('[data-deadline-continue]').click()")
assert evaluate("document.querySelector('.deadline-date-picker').hidden && !document.querySelector('.deadline-time-picker').hidden")
evaluate("document.querySelector('[data-deadline-hour]').value='8'; document.querySelector('[data-deadline-minute]').value='43'; document.querySelector('[data-deadline-period]').value='PM'; document.querySelector('[data-deadline-done]').click()")
result = evaluate("({value: document.querySelector('input[name=deadline]').value, display: document.querySelector('.deadline-picker-display').textContent, timeClosed: document.querySelector('.deadline-time-picker').hidden})")
assert result["value"].endswith("T20:43") and "08:43 PM" in result["display"] and result["timeClosed"], result
print(json.dumps({"calendar": calendar, "deadline": result}))
ws.close()
