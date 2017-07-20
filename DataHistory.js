RedwoodHighFrequencyTrading.factory("DataHistory", function () {
   var api = {};

   api.createDataHistory = function (startTime, startFP, myId, group, debugMode, speedCost, startingWealth, maxSpread) {
      //Variables
      dataHistory = {};
      
      dataHistory.startTime = startTime;
      dataHistory.myId = myId;
      dataHistory.group = group;
      dataHistory.curFundPrice = [startTime, startFP, 0];
      dataHistory.pastFundPrices = [];
      dataHistory.transactions = [];    //entries look like [timestamp, myTransaction]
      dataHistory.profit = startingWealth;
      dataHistory.speedCost = speedCost;
      dataHistory.maxSpread = maxSpread;

      dataHistory.playerData = {};     //holds state, offer and profit data for each player in the group
      dataHistory.lowestSpread = "N/A";

      dataHistory.highestMarketPrice = startFP;
      dataHistory.lowestMarketPrice = startFP;
      dataHistory.highestProfitPrice = startingWealth;
      dataHistory.lowestProfitPrice = startingWealth;

      dataHistory.debugMode = debugMode;

      dataHistory.recvMessage = function (msg) {

         console.log("[DEBUG] Data History recieved msg: ");

         switch (msg.msgType) {
            case "FPC"      :
               this.recordFPCchange(msg);
               break;
            case "C_TRA"    :
               this.storeTransaction(msg);
               break;
            case "USPEED" :
               this.storeSpeedChange(msg);
               break;
            case "C_UBUY"   :
            case "C_EBUY"   :
               this.recordBuyOffer(msg);
               break;
            case "C_USELL"  :
            case "C_ESELL"  :
               this.recordSellOffer(msg);
               break;
            case "C_RBUY"   :
               //this.storeBuyOffer(msg.msgData[1], msg.msgData[0]);
               this.storeBuyOffer(msg.timeStamp, msg.subjectID);
               break;
            case "C_RSELL"  :
               this.storeBuyOffer(msg.timeStamp, msg.subjectID);
               //this.storeSellOffer(msg.msgData[1], msg.msgData[0]);
               break;
            case "UMAKER" :
               this.recordStateChange("Maker", msg.msgData[0], msg.msgData[1]);
               break;
            case "USNIPE" :
               this.recordStateChange("Snipe", msg.msgData[0], msg.msgData[1]);
               break;
            case "UOUT" :
               this.recordStateChange("Out", msg.msgData[0], msg.msgData[1]);
               break;
            case "UUSPR" :
               this.playerData[msg.msgData[0]].spread = msg.msgData[1];
               this.calcLowestSpread();
               break;
         }
      };

      // Functions
      
      //initializes player data storage
      dataHistory.init = function () {
         for (var uid of this.group) {
            this.playerData[uid] = {
               speed: false,
               curBuyOffer: null,
               curSellOffer: null,
               pastBuyOffers: [],
               pastSellOffers: [],
               state: "Out",
               spread: this.maxSpread / 2,
               curProfitSegment: [this.startTime, this.profit, 0, "Out"], // [start time, start profit, slope, state]
               pastProfitSegments: []                              // [start time, end time, start price, end price, state]
            };
         }
      };

      dataHistory.calcLowestSpread = function () {
         this.lowestSpread = "N/A";
         for (var player in this.playerData) {
            if (this.playerData[player].state == "Maker" && (this.lowestSpread == "N/A" || this.playerData[player].spread < this.lowestSpread)) {
               this.lowestSpread = this.playerData[player].spread;
            }
         }
      };

      dataHistory.recordStateChange = function (newState, uid, timestamp) {
         this.playerData[uid].state = newState;
         this.calcLowestSpread();

         var curProfit = this.playerData[uid].curProfitSegment[1] - ((timestamp - this.playerData[uid].curProfitSegment[0]) * this.playerData[uid].curProfitSegment[2] / 1000);
         this.recordProfitSegment(curProfit, timestamp, this.playerData[uid].curProfitSegment[2], uid, newState);
      };

      // Adds fundamental price change to history
      dataHistory.recordFPCchange = function (fpcMsg) {
         if (fpcMsg.msgData[1] > this.highestMarketPrice) this.highestMarketPrice = fpcMsg.msgData[1];
         if (fpcMsg.msgData[1] < this.lowestMarketPrice) this.lowestMarketPrice = fpcMsg.msgData[1];

         console.log(printTime(getTime()) + " Player: " + this.myId + " in DataHistory price change\n");
         this.storeFundPrice(fpcMsg.msgData[0]);
         this.curFundPrice = [fpcMsg.msgData[0], fpcMsg.msgData[1], 0];
      };

      dataHistory.storeFundPrice = function (endTime) {
         this.pastFundPrices.push([this.curFundPrice[0], endTime, this.curFundPrice[1]]);
         this.curFundPrice = null;
      };

      //records a new buy offer
      dataHistory.recordBuyOffer = function (buyMsg) {
         if(buyMsg.subjectID > 0){
            console.log(buyMsg.subjectID);
            console.log(this.playerData[buyMsg.subjectID].state);
            if(this.playerData[buyMsg.subjectID].state == 'Snipe'){                                   //TEST -> don't want to graph snipe offer
               console.log("Tried to record buy offer, state: "  + this.playerData[buyMsg.subjectID].state);
               return;
            }
            //Check if current buy offer needs to be stored
            if (this.playerData[buyMsg.subjectID].curBuyOffer != null) {
               this.storeBuyOffer(buyMsg.timeStamp, buyMsg.subjectID);
               console.log("Data being stored: " + buyMsg.timeStamp + " : " + buyMsg.subjectID);
               console.log("Local timestamp: " + getTime());
            }
            //Push on new buy offer
            this.playerData[buyMsg.subjectID].curBuyOffer = [buyMsg.timeStamp, buyMsg.price];   // [timestamp, price]

            // check to see if new buy price is lowest price so far
            if (buyMsg.price < this.lowestMarketPrice) this.lowestMarketPrice = buyMsg.price;
         }
      };

      // Records a new Sell offer
      dataHistory.recordSellOffer = function (sellMsg) {
         if(sellMsg.subjectID > 0){                            //TEST 7/20/17 
            console.log(sellMsg.subjectID);
            console.log(this.playerData[sellMsg.subjectID].state);
            if(this.playerData[sellMsg.subjectID].state == 'Snipe'){                                 //TEST -> don't want to graph snipe offer
               console.log("Tried to record sell offer, state: "  + this.playerData[sellMsg.subjectID].state);
               return;
            }
            //Check if current sell offer needs to be stored
            if (this.playerData[sellMsg.subjectID].curSellOffer != null) {
               this.storeSellOffer(sellMsg.timeStamp, sellMsg.subjectID);
            }
            //Push on new sell offer
            this.playerData[sellMsg.subjectID].curSellOffer = [sellMsg.timeStamp, sellMsg.price];   // [timestamp, price]

            // check to see if new sell price is highest price so far
            if (sellMsg.price > this.highestMarketPrice) this.highestMarketPrice = sellMsg.price;
         }
      };

      // Shifts buy offer from currently being active into the history
      dataHistory.storeBuyOffer = function (endTime, uid) {
         if (this.playerData[uid].curBuyOffer == null) {
            throw "Cannot shift " + uid + "'s buy offer because it is null";
         }
         this.playerData[uid].pastBuyOffers.push([this.playerData[uid].curBuyOffer[0], endTime, this.playerData[uid].curBuyOffer[1]]);  // [startTimestamp, endTimestamp, price]
         this.playerData[uid].curBuyOffer = null;
      };

      // Shifts sell offer from currently being active into the history
      dataHistory.storeSellOffer = function (endTime, uid) {
         if (this.playerData[uid].curSellOffer == null) {
            throw "Cannot shift " + uid + "'s sell offer because it is null";
         }
         this.playerData[uid].pastSellOffers.push([this.playerData[uid].curSellOffer[0], endTime, this.playerData[uid].curSellOffer[1]]);  // [startTimestamp, endTimestamp, price]
         this.playerData[uid].curSellOffer = null;
      };


      dataHistory.storeTransaction = function (msg) {
         if (msg.buyerID == this.myId) {                                            // if I'm the buyer
            this.profit += msg.FPC - msg.price;                                     //fundPrice - myPrice
         }
         else if (msg.sellerID == this.myId) {                                      //if I'm the seller
            this.profit += msg.price - msg.FPC;
         }

         if (msg.buyerID != 0) {
            if (this.playerData[msg.buyerID].curBuyOffer !== null) this.storeBuyOffer(msg.timeStamp, msg.buyerID);

            var uid = msg.buyerID;
            var curProfit = this.playerData[uid].curProfitSegment[1] - ((msg.timeStamp - this.playerData[uid].curProfitSegment[0]) * this.playerData[uid].curProfitSegment[2] / 1000000000); //changed from 1000
            this.recordProfitSegment(curProfit + msg.FPC - msg.price, msg.timeStamp, this.playerData[uid].curProfitSegment[2], uid, this.playerData[uid].state);
         }
         if (msg.sellerID != 0) {
            if (this.playerData[msg.sellerID].curSellOffer !== null) this.storeSellOffer(msg.timeStamp, msg.sellerID);

            var uid = msg.sellerID;
            var curProfit = this.playerData[uid].curProfitSegment[1] - ((msg.timeStamp - this.playerData[uid].curProfitSegment[0]) * this.playerData[uid].curProfitSegment[2] / 1000000000); //changed from 1000
            this.recordProfitSegment(curProfit + msg.price - msg.FPC, msg.timeStamp, this.playerData[uid].curProfitSegment[2], uid, this.playerData[uid].state);
         }
         this.transactions.push(msg.msgData);
      };

      dataHistory.storeSpeedChange = function (msg) { //("USER", "USPEED", [rs.user_id, $scope.using_speed, $scope.tradingGraph.getCurOffsetTime()])
         var uid = msg.msgData[0];
         this.playerData[uid].speed = msg.msgData[1];
         var curProfit = this.playerData[uid].curProfitSegment[1] - ((msg.msgData[2] - this.playerData[uid].curProfitSegment[0]) * this.playerData[uid].curProfitSegment[2] / 1000000000); //changed from 1000
         this.recordProfitSegment(curProfit, msg.msgData[2], msg.msgData[1] ? this.speedCost : 0, uid, this.playerData[uid].state);
      };

      dataHistory.recordProfitSegment = function (price, startTime, slope, uid, state) {
         if (price > this.highestProfitPrice) this.highestProfitPrice = price;
         if (price < this.lowestProfitPrice) this.lowestProfitPrice = price;

         if (this.playerData[uid].curProfitSegment != null) {
            this.storeProfitSegment(startTime, uid);
         }
         this.playerData[uid].curProfitSegment = [startTime, price, slope, state];
         console.log("player: " + uid + " state: " + state + " price:" + price + " \n");
      };

      dataHistory.storeProfitSegment = function (endTime, uid) {
         if (this.playerData[uid].curProfitSegment == null) {
            throw "Cannot store current profit segment because it is null";
         }
         //find end price by subtracting how far graph has descended from start price
         var endPrice = this.playerData[uid].curProfitSegment[1] - ((endTime - this.playerData[uid].curProfitSegment[0]) * this.playerData[uid].curProfitSegment[2] / 1000000000); //changed from 1000
         this.playerData[uid].pastProfitSegments.push([this.playerData[uid].curProfitSegment[0], endTime, this.playerData[uid].curProfitSegment[1], endPrice, this.playerData[uid].curProfitSegment[3]]);
         this.playerData[uid].curProfitSegment = null;
      };

      return dataHistory;
   };

   return api;
});
