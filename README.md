# OpenAI API Godot template

This repository is created as a template for the purpose to be used in an assignment for the course Human-Agent Interaction in Leiden University.

### Requirements
- Godot 4.4 (more recent should also work)
- The plugin Godot dotenv (https://godotengine.org/asset-library/asset/3336) by lsbt installed from the Godot Asset Library and activated in the project

### How to use

- clone the repository, and in Godot select the import option to make a new project, and navigate to the directory where you cloned the repo
- create a .env file in the scripts directory and create the variable API_KEY, and assign to it your API key.
- set the context given to the model in the _system_prompt method in _api_client.gd_
- set the Main scene as the main scene and run the project

### Structure

This project is created minimally with only a chatbox representing the conversation with the agent, mostly to provide the framework for making HTTP requests to the openAI API and setting up a basic agent scene.

Godot has a 2D and 3D editor which you can use to add any asset (3D models, animations, etc) you want to make a virtual agent for the assignment.