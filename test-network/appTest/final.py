filename1 = 'app1.log'
filename2 = 'app2.log'

file1 = open(filename1, 'r')
Lines1 = file1.readlines()

file2 = open(filename2, 'r')
Lines2 = file2.readlines()

rlines1 = []
rlines2 = []

for line2 in Lines1:
    if '/get/claim' in line2:
        index = line2.find(' ')
        subs = line2[index+1:-1]
        print(subs)
        rlines2.append(int(subs))

for line1 in Lines1:
    if '/check/claim' in line1:
        index = line1.rfind(' ')
        subs = line1[index+1:-1]
        rlines1.append(int(subs))

print(rlines1)
print(rlines2)

for i in range(len(rlines2)):
    val = rlines1[i] - rlines2[i]
    print(val)
