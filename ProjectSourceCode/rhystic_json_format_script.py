import json

#open json file and load into dict object
#json file obtained from https://scryfall.com/docs/api/bulk-data under 'Default cards'
with open('default-cards-20240704210810.json') as f:
    d = json.load(f)
file_obj = open("format.txt","a")

for i in d:
    # initialize string to format
    values = ''

    #checking if the needed columns exist and formatting them to not cause errors
    if ('name' in i) & ('oracle_text' in i) & ('image_uris' in i) & ('mana_cost' in i) & ('rarity' in i):
        name = i['name'].replace('\n','').replace('\'','').replace('\"','').replace('−','-')
        text = (i['oracle_text']).replace('\n','').replace('\'','').replace('\"','').replace('−','-')
        url =  i['image_uris']['normal'].replace('\n','').replace('\'','').replace('\"','').replace('−','-')
        rare = i['rarity'].replace('\n','').replace('\'','').replace('\"','').replace('−','-')
        mana =  i['mana_cost'].replace('\n','').replace('\'','').replace('\"','').replace('−','-')
        if (mana == ''):
            mana = "{}"

        # converting price to usd if not in usd and if in tix, pricing at 0 usd 
        price = i['prices']
        if (price['usd']):
            price = price['usd']
        elif (price['eur']):
            price = round((float(price['eur'])*1.08),2)
        else:
            price = 0.00

        #putting all values into a string thats in the proper format for the sql insert statement 
        values = str('(\'' + name + '\', \'' + text + '\', \'' + url + '\', ' + '\''+mana+'\''+ ','+ str(price) + ',\'' + rare + '\'),\n')
        file_obj.write(values)

file_obj.close()