from flask import Flask, request, jsonify, render_template
import os
from openai import AzureOpenAI
import json

app = Flask(__name__)

# Fetch values from environment variables
endpoint = os.getenv("ENDPOINT_URL")
deployment = os.getenv("DEPLOYMENT_NAME")
search_endpoint = os.getenv("SEARCH_ENDPOINT")
search_key = os.getenv("SEARCH_KEY")
search_index = os.getenv("SEARCH_INDEX_NAME")
api_key = os.getenv("AZURE_OPENAI_API_KEY")

# Create the AzureOpenAI client with API key
client = AzureOpenAI(
    azure_endpoint=endpoint,
    api_key=api_key,
    api_version="2024-05-01-preview"
)

# Route to serve the main chatbot page
@app.route('/')
def index():
    return render_template('index.html')

# Endpoint to handle chat requests
@app.route("/chat", methods=["POST"])
def chat():
    data = request.get_json()
    user_message = data.get("message")

    if not user_message:
        app.logger.error("No message provided")
        return jsonify({"error": "No message provided"}), 400

    try:
        if "@image" in user_message.lower():
            # Generate image using DALL-E 3
            result = client.images.generate(
                model="dall-e-3",
                prompt=user_message,
                n=1
            )
            image_url = json.loads(result.model_dump_json())['data'][0]['url']
            return jsonify({"image_url": image_url})

        else:
            # Create chat completion request
            completion = client.chat.completions.create(
                model=deployment,
                messages=[{"role": "user", "content": user_message}],
                max_tokens=800,
                temperature=0,
                top_p=1,
                frequency_penalty=0,
                presence_penalty=0,
                stop=None,
                stream=False,
                extra_body={
                    "data_sources": [{
                        "type": "azure_search",
                        "parameters": {
                            "endpoint": search_endpoint,
                            "index_name": search_index,
                            "semantic_configuration": "default",
                            "query_type": "vector_semantic_hybrid",
                            "fields_mapping": {},
                            "in_scope": False,
                            "role_information": "You are an AI assistant that specializes in analyzing and providing information about RFP (Request for Proposal) documents. Your task is to extract key information, summarize sections, and respond to user queries about the RFP content in a clear manner. Responses should be provided in plain text without any markdown formatting (e.g., no bold, headings, or special symbols).",
                            "filter": None,
                            "strictness": 3,
                            "top_n_documents": 5,
                            "authentication": {
                                "type": "api_key",
                                "key": search_key
                            },
                            "embedding_dependency": {
                                "type": "deployment_name",
                                "deployment_name": "text-embedding-ada-002"
                            }
                        }
                    }]
                }
            )

            # Extract data from the ChatCompletion object
            choices = completion.choices
            if isinstance(choices, list) and len(choices) > 0:
                choice = choices[0]
                if hasattr(choice, 'message') and hasattr(choice.message, 'content'):
                    response_content = choice.message.content
                    return jsonify({"response": response_content})
                else:
                    app.logger.error("Unexpected response structure: missing 'message' or 'content'")
                    return jsonify({"error": "Unexpected response structure"}), 500
            else:
                app.logger.error("Unexpected response structure: 'choices' list is empty or not a list")
                return jsonify({"error": "Unexpected response structure"}), 500

    except Exception as e:
        app.logger.error(f"Exception occurred: {e}")
        return jsonify({"error": "Failed to process the request"}), 500
