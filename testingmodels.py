import pandas as pd
import re
import nltk
from nltk.corpus import stopwords
from nltk.stem import WordNetLemmatizer
from nltk.tokenize import TweetTokenizer
from sklearn.preprocessing import LabelEncoder
from sklearn.model_selection import train_test_split, GridSearchCV
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import classification_report, f1_score
from sklearn.svm import LinearSVC
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.pipeline import Pipeline
from sentence_transformers import SentenceTransformer
import warnings
warnings.filterwarnings('ignore')

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

X_text = df['cleaned_text']
y = df['encoded_labels']

# Train/test split (same for all models)
X_train_text, X_test_text, y_train, y_test = train_test_split(
    X_text, y, test_size=0.3, random_state=42, stratify=y
)

# ---- Model 1: SBERT + Logistic Regression ----
print("\n=== Model 1: SBERT + Logistic Regression ===")
sbert_model = SentenceTransformer('all-MiniLM-L6-v2')
X_train_sbert = sbert_model.encode(X_train_text.tolist(), convert_to_numpy=True)
X_test_sbert = sbert_model.encode(X_test_text.tolist(), convert_to_numpy=True)

# hyperparameter options
param_grid_sbert = {
    'C': [0.001, 0.01, 0.1, 1, 10, 100],        # range
    'penalty': ['l1', 'l2', 'elasticnet'],      # options
    'solver': ['liblinear', 'saga', 'lbfgs'],   # solvers
    'l1_ratio': [0.0, 0.5, 1.0],                # only used with elasticnet
    'class_weight': [None, 'balanced']
}

# gridsearch parameters
sbert_grid = GridSearchCV(
    LogisticRegression(max_iter=300),
    param_grid_sbert,
    scoring='f1_weighted',
    cv=3,                                   # 3 fold testing
    n_jobs=-1                           
)

sbert_grid.fit(X_train_sbert, y_train)
y_pred_sbert = sbert_grid.predict(X_test_sbert)

# print results
print("Best Parameters:", sbert_grid.best_params_)
print(classification_report(y_test, y_pred_sbert))
sbert_f1 = f1_score(y_test, y_pred_sbert, average='weighted')

# ---- Model 2: TF-IDF + Logistic Regression (GridSearchCV) ----
print("\n=== Model 2: TF-IDF + Logistic Regression (GridSearch) ===")

pipeline_lr = Pipeline([
    ('tfidf', TfidfVectorizer()),
    ('clf', LogisticRegression(max_iter=300))
])

param_grid_lr = {
    'tfidf__ngram_range': [(1,1), (1,2)],
    'tfidf__max_df': [0.85, 1.0],
    'tfidf__min_df': [1, 3, 5],
    'tfidf__sublinear_tf': [True, False],
    'clf__C': [0.01, 0.1, 1, 10, 100],
    'clf__class_weight': ['balanced', None]
}

grid_lr = GridSearchCV(pipeline_lr, param_grid_lr, cv=3, scoring='f1_weighted', n_jobs=-1)
grid_lr.fit(X_train_text, y_train)
y_pred_lr = grid_lr.predict(X_test_text)

print("Best Parameters:", grid_lr.best_params_)
print(classification_report(y_test, y_pred_lr))
lr_f1 = f1_score(y_test, y_pred_lr, average='weighted')

# ---- Model 3: TF-IDF + SVM (GridSearchCV) ----

print("\n=== Model 3: TF-IDF + Linear SVM (GridSearch) ===")

pipeline_svm = Pipeline([
    ('tfidf', TfidfVectorizer()),
    ('clf', LinearSVC())
])

param_grid_svm = {
    'tfidf__ngram_range': [(1, 1), (1, 2), (1, 3)],
    'tfidf__max_df': [0.75, 0.85, 1.0],
    'tfidf__min_df': [1, 3, 5],
    'tfidf__sublinear_tf': [True, False],
    
    'clf__C': [0.01, 0.1, 1, 10, 100],
    'clf__class_weight': [None, 'balanced'],
    'clf__loss': ['hinge', 'squared_hinge']  # Only for LinearSVC
}

grid_svm = GridSearchCV(pipeline_svm, param_grid_svm, cv=3, scoring='f1_weighted', n_jobs=-1)
grid_svm.fit(X_train_text, y_train)
y_pred_svm = grid_svm.predict(X_test_text)

print("Best Parameters:", grid_svm.best_params_)
print(classification_report(y_test, y_pred_svm))
svm_f1 = f1_score(y_test, y_pred_svm, average='weighted')

# ---- Summary ----
print("\n=== F1 Score Summary (weighted) ===")
print(f"SBERT + Logistic Regression (GridSearch): {sbert_f1:.4f}")
print(f"TF-IDF + Logistic Regression (GridSearch): {lr_f1:.4f}")
print(f"TF-IDF + SVM (GridSearch): {svm_f1:.4f}")