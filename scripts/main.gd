extends Control

@onready var input = $Input
@onready var display = $Display
@onready var button = $Button
@onready var agent = $Agent

func _ready():

	button.pressed.connect(_on_button_pressed)
	agent.response_received.connect(_on_agent_response)
	agent.error.connect(_on_agent_error)


func _process(delta):
	if Input.is_action_just_pressed("send"):
		_on_button_pressed()

func _on_button_pressed():
	"""Updates chat display and passes the message to the agent"""
	var message = input.text
	agent.reply(message)
	display.text +="\nYou: " + message
	input.text = ""
	
func _on_agent_response(response_text):
	"""Update chat display after agent response"""
	display.text += "\nAgent: " + response_text
	
func _on_agent_error(error_message):
	"""Show error message in terminal and chat display"""
	display.text += "\nError: "+error_message
	print("error ", error_message)
