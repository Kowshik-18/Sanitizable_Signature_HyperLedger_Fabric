from bs4 import BeautifulSoup
import pandas as pd
import os

modules1 = ['addDID', 'addIssuer', 'createCred', 'delegateRight', 'verifyCred']
attributeCounts = [4,16,32,64,128]  # Number of attributes to test with
rounds = [i for i in range(3)]  

maindict_latency = {}

for attributes in attributeCounts:
    round_trip_times = []
    for module1 in modules1:
        templistl = []
        for round in rounds:
            filename = f'./reports-final2/{module1}_report_{round}_{attributes}.html'
            
            if not os.path.isfile(filename):
                print(f"File {filename} not found. Skipping.")
                continue

            with open(filename, "r") as HTMLFileToBeOpened:
                contents = HTMLFileToBeOpened.read()
                beautifulSoupText = BeautifulSoup(contents, 'lxml')
                vals = beautifulSoupText.find_all('td')

                templistl.append(float(vals[6].text.strip()))  
        
        if templistl:
            avg_module_latency = sum(templistl) / len(templistl)
            round_trip_times.append(avg_module_latency)
    
    if round_trip_times:
        total_round_trip_time = sum(round_trip_times)
        maindict_latency[attributes] = total_round_trip_time

print(maindict_latency)

# Convert the dictionary to a DataFrame and save as CSV
df = pd.DataFrame(list(maindict_latency.items()), columns=['number of attributes', 'RoundTripTime (s)'])
df.to_csv("RoundTripTime.csv", index=False)
