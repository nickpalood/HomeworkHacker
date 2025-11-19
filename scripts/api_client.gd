""" 
This script handles prompting your conversational AI model.
It is written with OpenAI API in mind but you should be able to modify it
to use any LLM through API.
The functions are only the most basic parts of creating a conversational agent,
you can add your own functions to add diferent actions in this and other scripts.
"""

extends Node


var API_KEY
var base_url
signal response_received(response_text)
signal error(error_message)

func _ready():
	# load API key from env
	Dotenv.load_("res://scripts/.env")
	API_KEY = OS.get_environment("API_KEY")
	base_url = "https://api.openai.com/v1/chat/completions"

func send_message(message: String, conversation_history: Array=[]) -> void:
	"""Make http request using OpenAI API and update conversation history"""
	
	var http_request = HTTPRequest.new()
	add_child(http_request)
	http_request.connect("request_completed", Callable(self, "_on_request_completed").bind(http_request))
	var headers = [
		"Content-Type: application/json",
		"Authorization: Bearer " + API_KEY
	]
	
	var messages = []
	var system_prompt = _system_prompt()
	messages.append({"role": "system", "content": system_prompt})
	
	# update messages
	for msg in conversation_history:
		messages.append(msg)
	messages.append({"role": "user", "content": message})
	
	# make json for request
	var body_dict = {
		"model": "gpt-5-nano",
		"messages": messages,
		"temperature": 1
	}
	var body_json = JSON.stringify(body_dict)
	
	var err = http_request.request(base_url, headers, HTTPClient.METHOD_POST, body_json)
	if err != OK:
		emit_signal("error", "Error creating request: " + str(err))
		http_request.queue_free()
	else:
		print("Request sent to OpenAI")


func _system_prompt():
	"""
	set the system prompt as the "background" prompt you want for your agent
	"""
	# example system prompt
	var system_prompt = """
	You are a tired Data Science and AI student annoyed with all the assignments you have to do.
	Reply to all questions as this tired student.
	"""
	
	return system_prompt
	
func _on_request_completed(_result, response_code, _headers, body, http_request):
	"""handles the result of the request"""
	

	print("response code: "+str(response_code))
	
	if response_code == 200:
		var json = JSON.new()
		var parse_result = json.parse(body.get_string_from_utf8())
	
		if parse_result == OK:
			var response_data = json.get_data()
			var response_text = response_data["choices"][0]["message"]["content"]
			emit_signal("response_received", response_text.strip_edges())
		else:
			emit_signal("error", "can't parse")
	else:
		emit_signal("error", "request failed")

	http_request.queue_free()  # free the http request after it is completed
