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

nltk.download('stopwords')
nltk.download('wordnet')
nltk.download('punkt')

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
model = LogisticRegression(max_iter=300, class_weight='balanced')
model.fit(X_train, y_train)

# Evaluate model
y_pred = model.predict(X_test)
print("Classification Report:\n", classification_report(y_test, y_pred))
print("Confusion Matrix:\n", confusion_matrix(y_test, y_pred))
print("Crisis Type Count:\n", df['crisis_type'].value_counts())

# functions of the model

# takes in a tweet and returns the crisis it indicates
def predict_crisis_type(text, threshold=0.4):
    cleaned = clean_text(text)
    vec = sbert_model.encode([cleaned])
    probas = model.predict_proba(vec)[0]
    max_prob = probas.max()
    max_index = probas.argmax()
    if max_prob < threshold:
        return "Uncertain"
    return label_encoder.inverse_transform([max_index])[0]

# does the same thing as above, but shows the steps and top options
def predict_crisis_type_expanded(text, threshold=0.4, show_top_n=3):
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

# example tweets
print(predict_crisis_type_expanded("oh my god lots of water!! the floor is covered in water"))
print(predict_crisis_type_expanded("we haven't seen rain in weeks, everything is dry"))
print(predict_crisis_type_expanded("the ground is shaking"))
print(predict_crisis_type_expanded("heard a strang noise...."))

print("Prediction 1: " + predict_crisis_type("oh my god lots of water!! the floor is covered in water"))
print("Prediction 2: " + predict_crisis_type("we haven't seen rain in weeks, everything is dry"))
print("Prediction 3: " + predict_crisis_type("the ground is shaking"))
print("Prediction 4: " + predict_crisis_type("heard a strang noise...."))
