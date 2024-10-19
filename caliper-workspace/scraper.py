from bs4 import BeautifulSoup
import pandas as pd
import os

modules1 = ['addDID', 'addIssuer', 'createCred', 'delegateRight', 'verifyCred']
workersCounts = [25, 50, 75, 100, 125, 150]  
rounds = [i for i in range(2)]  

maindict_latency = {}
maindict_throughput = {}

for module1 in modules1:
    maindict_latency[module1] = []
    maindict_throughput[module1] = []
    for workers in workersCounts:
        templist_latency = []
        templist_throughput = []
        for r in rounds:
            filename = f'./reports-final/{module1}_report_{r}_{workers}.html'
            
            if not os.path.isfile(filename):
                print(f"File {filename} not found. Skipping.")
                continue

            with open(filename, "r") as HTMLFileToBeOpened:
                contents = HTMLFileToBeOpened.read()
                beautifulSoupText = BeautifulSoup(contents, 'lxml')
                vals = beautifulSoupText.find_all('td')

                latency_value = vals[6].text.strip()
                throughput_value = vals[7].text.strip()
                
                # Replace '-' with '0' and convert to float
                latency_value = float(latency_value) if latency_value != '-' else 0.0
                throughput_value = float(throughput_value) if throughput_value != '-' else 0.0

                templist_latency.append(latency_value)
                templist_throughput.append(throughput_value)

        if templist_latency and templist_throughput:
            avgl = sum(templist_latency) / len(templist_latency)
            avgt = sum(templist_throughput) / len(templist_throughput)
            maindict_latency[module1].append(avgl)
            maindict_throughput[module1].append(avgt)

# Prepare the final DataFrames
df_latency = pd.DataFrame(maindict_latency)
df_throughput = pd.DataFrame(maindict_throughput)

# Add the 'number of users/workers' column
df_latency.insert(0, 'number of users', workersCounts)
df_throughput.insert(0, 'number of users', workersCounts)

# Save to CSV
df_latency.to_csv("latency.csv", index=False)
df_throughput.to_csv("throughput.csv", index=False)
