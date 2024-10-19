import subprocess
import time

# command1 = "node network.js > app.log 2>&1"

# file1 = subprocess.run(command1.split())
command2 = "node test.js"

for i in range(20):
    file2 = subprocess.run(command2.split())
    time.sleep(30)
