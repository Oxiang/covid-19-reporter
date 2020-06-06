from pymongo import MongoClient
#from dotenv import load_dotenv
import requests
from bs4 import BeautifulSoup as bs
import os
import telegram
import pandas as pd
import datetime

# pip install pymongo[srv]
# pip install python-dotenv
# pip install pymongo
# pip install python-telegram-bot

# Get environmental variables
#load_dotenv()

# Link with MongoDB
uri = os.getenv("ATLAS_URI")
token = os.getenv("TOKEN")
client = MongoClient(uri)
#collection = client['test']['users']
#collection_countries = client['test']['countries']
changes = []

# These are for testing units
#collection = client['test']['user_tests']
#collection_countries = client['test']['countries_tests']
#token = "1185986114:AAEHuwvLeUmW2Y6X6oeXjFv_Y-VNGrSg4e4"


def world_scrape():
    # Scrap world page
    world_url = "https://www.worldometers.info/coronavirus/"
    page = requests.get(world_url)
#    soup = bs(page.content, 'html.parser')
    soup = bs(page.content, 'lxml')
#    main_table = soup.find_all('div', class_="main_table_countries_div")
    main_table = soup.find_all('table', id="main_table_countries_today")

    data = []
    elements = main_table[0].find('tbody')
    elements = elements.find_all('td')
    temp_list = []
    for element in elements:
        temp_list.append(element.getText())
    data.append(temp_list)
    
    all_country_df = pd.read_csv('2020_countries.csv')
    all_country_list = all_country_df['country'].tolist()
    
    # Reformat data
    world_data = []
    for i,cty in enumerate(temp_list):
        if cty in all_country_list:
            country_dict = {}
            country_dict["country"] = temp_list[i+0]
            country_dict["total_cases"] = temp_list[i+1]
            country_dict["new_cases"] = temp_list[i+2]
            country_dict["total_deaths"] = temp_list[i+3]
            country_dict["new_deaths"] = temp_list[i+4]
            country_dict["total_recovered"] = temp_list[i+5]
#            country_dict["active_cases"] = temp_list[i+6]
#            country_dict["serious_critical"] = temp_list[i+7]
#            country_dict["tot_cases_per_m"] = temp_list[i+8]
#            country_dict["death_per_m"] = temp_list[i+9]
#            country_dict["total_tests"] = temp_list[i+10]
#            country_dict["tests_per_m"] = temp_list[i+11]
            world_data.append(country_dict)

    # Get all the current data! Get the data and put into dictionary
    country_data = collection_countries.find({})
    db_data = []
    for data in country_data:
        temp_country = {}
        temp_country['country'] = data['country']
        temp_country['total_cases'] = data['total_cases']
        temp_country['new_cases'] = data['new_cases']
        temp_country['total_deaths'] = data['total_deaths']
        temp_country['new_deaths'] = data['new_deaths']
        temp_country['total_recovered'] = data['total_recovered']
        db_data.append(temp_country)
        
    # Check for those changes
#    global changes
#    for cty in world_data:
#        if cty not in db_data:
#            changes.append(cty['country'])
    
#    results = collection_countries.insert_many(world_data)
    for countries in world_data:
        myquery = {"country": countries["country"]}
        new_values = countries
        collection_countries.update_one(myquery, {"$set":new_values}, upsert= True)
        print("Updated {}".format(countries["country"]))
    
def update_all():
    # Access to telegram
    bot = telegram.Bot(token=token)
    now = datetime.datetime.now()
    # Access to all the country data
    temp_country = {}
    country_data = collection_countries.find({})
    for data in country_data:
        cty = data['country']
        total_cases = data['total_cases']
        new_cases = data['new_cases']
        if new_cases == "":
            new_cases = "(0)"
        else:
            new_cases = "(" + new_cases + ")"
        total_deaths = data['total_deaths']
        new_deaths = data['new_deaths']
        if new_deaths == "":
            new_deaths = "(0)"
        else:
            new_deaths = "(" + new_deaths + ")"
        total_recovered = data['total_recovered']
        
        temp_list = [total_cases, new_cases, total_deaths, new_deaths, total_recovered]
        temp_country[cty] = temp_list

        
    global changes
    all_users = collection.find()
    for user in all_users:
        chatId = user["chatId"]
        subscriptions = user["subscription"]
        general_msg = "Updates for today - ({})".format(now.strftime("%d/%m/%Y"))
        bot.send_message(chatId, general_msg)
        for country in subscriptions:
            total_cases = temp_country[country][0]
            new_cases = temp_country[country][1]
            total_deaths = temp_country[country][2]
            new_deaths = temp_country[country][3]
            total_recovered = temp_country[country][4]
            message =  str(country) + "\nTotal Cases: " + str(total_cases) + " " + str(new_cases) + \
                        "\nTotal Deaths " + str(total_deaths) + " " + str(new_deaths) + \
                        "\nTotal Recovered: " + str(total_recovered)
            bot.send_message(chatId, message)

world_scrape()
update_all()







