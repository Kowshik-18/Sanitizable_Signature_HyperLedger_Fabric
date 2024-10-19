import subprocess
import yaml
import shutil
import time
import os

os.makedirs('./reports-final', exist_ok=True)

command = "npx caliper launch manager --caliper-workspace ./ --caliper-networkconfig networks/networkConfig.yaml --caliper-benchconfig benchmarks/myAssetBenchmark.yaml --caliper-flow-only-test"

fname = "./benchmarks/myAssetBenchmark.yaml"

with open(fname, 'r') as stream:
    data = yaml.load(stream, Loader=yaml.FullLoader)

modules1 = ['addDID', 'addIssuer', 'createCred', 'delegateRight', 'verifyCred']
# modules1 = ['verifyCred']
userCounts = [25, 50, 75, 100, 125, 150]  # Number of users to test with
# userCounts = [90]

for module1 in modules1:
    for users in userCounts:
        workers = users
        txNumber = 5  

        data['test']['rounds'][0]['label'] = module1
        data['test']['rounds'][0]['workload']['module'] = "workload/" + module1 + ".js"
        data['test']['workers']['number'] = workers
        data['test']['rounds'][0]['txNumber'] = txNumber
        data['test']['rounds'][0]['rateControl']['opts']['tps'] = 10

        with open(fname, 'w') as yaml_file:
            yaml.dump(data, yaml_file, default_flow_style=False)

        for i in range(2):
            result = subprocess.run(command.split(), capture_output=True, text=True)
            print(result.stdout)
            # print(result.stderr)
            print(f"{module1}: Completed run for worker {workers} and round {i}")
            time.sleep(5)

            outputfilename = f"./reports-final/{module1}_report_{i}_{workers}.html"
            inputfilename = "./report.html"

            try:
                shutil.copy(inputfilename, outputfilename)
            except FileNotFoundError:
                print(f"Report file {inputfilename} not found. Skipping copy operation.")

            # Wait a short period before the next run to avoid conflicts
            time.sleep(15)
