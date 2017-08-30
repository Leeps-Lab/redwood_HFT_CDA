import sys
import pdb

nGroups = int(sys.argv[1])
nPlayersPerGroup = int(sys.argv[2])
periods = int(sys.argv[3])
exchangeType = "cda"
subject = "default"
startingWealth = 50
speedCost = 0.02
maxSpread = 5
exchangeRate = 4
experimentLength = 300000
marketEventsURL = "https://dl.dropboxusercontent.com/s/j0qsfuedcgmuiks/investorData.csv?dl=1"
priceChangesURL = "https://dl.dropboxusercontent.com/s/4i20xxhqewl9y4d/jumpData.csv?dl=1"
exchangeURI = "52.59.251.204"

groupList = list()
for group in range(1,nGroups+1):
    groupList.append(range((group-1)*nPlayersPerGroup+1,group*nPlayersPerGroup+1))

for period in range(1,periods+1):
    fName = exchangeType+"_config_"+str(nGroups)+"groups_p"+str(period)+".csv"
    fOut = open(fName,"w")
    fOut.write("period,subject,groups,startingWealth,speedCost,maxSpread,marketEventsURL,priceChangesURL,experimentLength,exchangeRate,exchangeURI\n")
    fOut.write(str(period)+","+subject+",\""+str(groupList)+"\","+str(startingWealth)+","+str(speedCost)+","+str(maxSpread)+","+marketEventsURL+","+priceChangesURL+","+str(experimentLength)+","+str(exchangeRate)+","+exchangeURI)
    fOut.close()
    
