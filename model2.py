#reads through most recent blob
import pandas as pd
import re
import nltk
from nltk.corpus import stopwords
from nltk.stem import WordNetLemmatizer
from nltk.tokenize import TweetTokenizer
from sklearn.preprocessing import LabelEncoder
from sklearn.model_selection import train_test_split
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import classification_report, confusion_matrix
from sentence_transformers import SentenceTransformer
from pymongo.mongo_client import MongoClient
from pymongo.server_api import ServerApi
import spacy
from geopy.geocoders import Nominatim
import time
import json
from azure.storage.blob import BlobServiceClient
from datetime import datetime, timezone
import os
from dotenv import load_dotenv

# essentials for later functions
#spacy.cli.download("en_core_web_trf")
nlp = spacy.load("en_core_web_trf")
loc = Nominatim(user_agent="Geopy Library", timeout=10)
nltk.download('stopwords')
nltk.download('wordnet')
nltk.download('punkt')
load_dotenv()

# load dataset
df = pd.read_csv("Tweets.csv")

# initialize lemmatizer, stop words, and tokenizer
lemmatizer = WordNetLemmatizer()
stop_words = set(stopwords.words("english"))
tokenizer = TweetTokenizer()

# function to clean text
def clean_text(text):
    # get rid of links, mentions, and non alphabetic symbols
    text = re.sub(r"http\S+|www\S+|https\S+", "", text)
    text = re.sub(r"@\w+", "", text)
    text = re.sub(r"#(\w+)", r"\1", text)
    text = re.sub(r"[^a-zA-Z\s]", "", text)
    text = text.lower()
    tokens = tokenizer.tokenize(text)
    tokens = [lemmatizer.lemmatize(word) for word in tokens if word not in stop_words]
    return " ".join(tokens)

# clean each tweet
df['cleaned_text'] = df['text'].apply(clean_text)

# encode labels
label_encoder = LabelEncoder()
df['encoded_labels'] = label_encoder.fit_transform(df['crisis_type'])

# load SBERT model 
sbert_model = SentenceTransformer('all-MiniLM-L6-v2')

# get tweet embeddings
X = sbert_model.encode(df['cleaned_text'].tolist(), convert_to_numpy=True)
y = df['encoded_labels']

# train/test split
X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

# train the model
model = LogisticRegression(C=100, class_weight=None, penalty='l2', solver='saga',max_iter=300)
model.fit(X_train, y_train)

# Evaluate model
#y_pred = model.predict(X_test)
#print("Classification Report:\n", classification_report(y_test, y_pred))
#print("Confusion Matrix:\n", confusion_matrix(y_test, y_pred))
#print("Crisis Type Count:\n", df['crisis_type'].value_counts())

# functions of the model

# takes in a tweet and returns the crisis it indicates
def predict_crisis_type(text, threshold=0.7):
    cleaned = clean_text(text)
    vec = sbert_model.encode([cleaned])
    probas = model.predict_proba(vec)[0]
    max_prob = probas.max()
    max_index = probas.argmax()
    if max_prob < threshold:
        return "Uncertain"
    return label_encoder.inverse_transform([max_index])[0]

# does the same thing as above, but shows the steps and top options
def predict_crisis_type_expanded(text, threshold=0.7, show_top_n=3):
    cleaned = clean_text(text)
    vec = sbert_model.encode([cleaned])
    proba = model.predict_proba(vec)[0]
    
    top_n = sorted(zip(label_encoder.classes_, proba), key=lambda x: x[1], reverse=True)[:show_top_n]

    print(f"Cleaned Input: {cleaned}\n")
    print(f"Top {show_top_n} Predictions:")
    for label, score in top_n:
        print(f"  - {label}: {score:.4f}")
    
    max_prob = max(proba)
    if max_prob < threshold:
        return "Uncertain"
    else:
        pred_label = label_encoder.inverse_transform([proba.argmax()])[0]
        return f"{pred_label}"

# extract locations based on spacy library
def extract_locations(text):
    doc = nlp(text)
    locations = [ent.text for ent in doc.ents if ent.label_ in ("GPE", "LOC")]
    return locations if locations else None

# getting coords from extracted locations
def get_coords(locations):
    coords = []
    addresses = []

    for l in locations:
        getLoc = loc.geocode(l)
        if getLoc:
            coords.append((getLoc.latitude, getLoc.longitude))
            addresses.append(getLoc.address)
        else:
            coords.append(None)
            addresses.append(None)    
    return coords, addresses

def extract_directional_location(text):
    pattern = r'\b(?:north|south|east|west|northeast|southeast|southwest|northwest) of ([A-Z][\w\s\-]+)'
    return re.findall(pattern, text, flags=re.IGNORECASE)

# pull from the azure data store

# azure storage config
connection_string = os.getenv("AZURE_STORAGE_CONNECTION_STRING")
container_name = "eventhub-output"

# connect to azure blob service
blob_service_client = BlobServiceClient.from_connection_string(connection_string)
container_client = blob_service_client.get_container_client(container_name)

# track names of all blobs we've already seen
seen_blobs = set()

uri = os.getenv("MONGODB_URI")
client = MongoClient(uri, server_api=ServerApi('1'))
db = client["crisis"]         # from Atlas dashboard
collection = db["updated_alerts"]            # name of your collection
while True:
    try:
        # List all blobs in the container
        blobs = list(container_client.list_blobs())
        if not blobs:
            print("No blobs found.")
            time.sleep(10)
            continue

        # Sort blobs by last modified date, descending
        blobs.sort(key=lambda b: b.last_modified, reverse=True)
        latest_blob = blobs[0]
        blob_name = latest_blob.name

        if blob_name in seen_blobs:
            print("No new blobs detected.")
            time.sleep(10)
            continue

        print(f"\nNew blob detected: {blob_name} (modified {latest_blob.last_modified})")

        # Download the blob
        blob_client = container_client.get_blob_client(blob_name)
        with open(blob_name, "wb") as f:
            f.write(blob_client.download_blob().readall())

        processed_docs = []

        # Process each line in the blob as a JSON object
        with open(blob_name, "r", encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if not line:
                    continue

                try:
                    entry = json.loads(line)
                except json.JSONDecodeError as e:
                    print("Error parsing line:", line)
                    print(e)
                    continue

                text = entry.get("text", "")
                model_output = predict_crisis_type(text)
                location_list = extract_locations(text) or []
                coords, addresses = get_coords(location_list)

                processed = {
                    "id": entry.get("id"),
                    "text": text,
                    "location": location_list,
                    "location_add": addresses,
                    "location_coords": coords,
                    "crisis_type": model_output,
                    "urgency": None,
                    "created_at": entry.get("created_at")
                }

                processed_docs.append(processed)

        # Insert into MongoDB
        if processed_docs:
            result = collection.insert_many(processed_docs)
            print(f"Inserted {len(result.inserted_ids)} documents into MongoDB.")

        # Mark blob as seen
        seen_blobs.add(blob_name)

    except Exception as e:
        print("Error:", e)

    time.sleep(10)