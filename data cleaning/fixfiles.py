import pandas as pd
from langdetect import detect, DetectorFactory
from langdetect.lang_detect_exception import LangDetectException

DetectorFactory.seed = 0

# load csv files to fill dataframes
df1 = pd.read_csv('crisis.csv')  
df2 = pd.read_csv('DisasterTweets.csv')  

# get only the relevant information
df1 = df1[['timestamp', 'text', 'crisis_type', 'urgency_label']]

# for when i figure out what to do about one of the datasets being empty
# df1 = df1[['timestamp', 'text', 'crisis_type', 'location', 'urgency_label']]

# rename columns to match
df2 = df2[['Timestamp', 'Tweets', 'Disaster']].rename(columns={
    'Tweets': 'text',
    'Disaster': 'crisis_type',
    'Timestamp' : 'timestamp'
})

# merge the two datasets
merged_df = pd.concat([df1, df2], ignore_index=True)

# function to detect the language used in the tweet
def detect_language(text):
    try:
        return detect(str(text))
    except LangDetectException:
        return "unknown"

# find the tweets in english and get rid of the rest
merged_df['language'] = merged_df['text'].apply(detect_language)
english_df = merged_df[merged_df['language'] == 'en'].drop(columns=['language'])

# fix the crisis types
english_df['crisis_type'] = english_df['crisis_type'].replace({
        'Fire' : 'Wildfire',
        'Floods' : 'Flood',
        'Hurricanes' : 'Hurricane',
        'Tornadoes' : 'Tornado'
})

# export results as csv
english_df.to_csv('Tweets.csv', index=False)