/* Angular service used for creating svg elements that graphically represent a market
 *  Created by Zachary Petersen - zacharypetersen1@gmail.com
 *  And Morgan! - gramorgan@gmail.com
 *
 *  To use this service, inject it and call makeTradingGraph(svgElementID)
 *     This will return a new graph object. Call graph.init(timeStamp) to
 *     initialize the graph, call graph.draw(timeStamp) to update the graph.
 */

RedwoodHighFrequencyTrading.factory("Graphing", function () {
   var api = {};

   // Returns new grpah object - pass in id of svg element on which graph will be drawn
   api.makeTradingGraph = function (marketSVGElementID, profitSVGElementID, adminStartTime, playerTimeOffset) {
      var graph = {};

      graph.marketElementId = marketSVGElementID;  //id of the market graph svg element
      graph.profitElementId = profitSVGElementID;  //id of the profit graph svg element
      graph.elementWidth = 0;          //Width and Height of the graph svg element
      graph.elementHeight = 0;         //    (use calculateSize to determine)
      graph.profitElementWidth = 0;    //Width and height of the profit svg element
      graph.profitElementHeight = 0;    
      graph.axisLabelWidth = 40;       //Width of area where price axis labels are drawn
      graph.graphPaddingRight = 20;    // how far from the x axis label that the line stops moving
      graph.marketSVG = d3.select('#' + graph.marketElementId); //market svg element
      graph.profitSVG = d3.select('#' + graph.profitElementId); //profit svg element
      graph.minPriceMarket = 0;             //min price on price axis for market graph
      graph.maxPriceMarket = 0;             //max price on price axis for market graph
      graph.centerPriceMarket = 0;          //desired price for center of graph
      graph.minPriceProfit = 0;             //min price on price axis for profit graph
      graph.maxPriceProfit = 0;             //max price on price axis for profit graph
      graph.centerPriceProfit = 0;
      graph.graphAdjustSpeedMarket = .1;      //speed that market price axis adjusts in pixels per frame
      graph.graphAdjustSpeedProfit = .1;      //speed that profit price axis adjusts in pixels per frame
      graph.marketPriceGridIncrement = 1;     //amount between each line on market price axis
      graph.profitPriceGridIncrement = 1;     //amount between each line on profit price axis
      graph.contractedTimeInterval = 30;      //amount of time displayed on time axis when graph is contracted
      graph.timeInterval = graph.contractedTimeInterval; //current amount in seconds displayed at once on full time axis
      graph.timeIncrement = 5;         //Amount in seconds between lines on time axis
      graph.currentTime = 0;           //Time displayed on graph
      graph.marketPriceLines = [];           //
      graph.timeLines = [];
      graph.pricesArray = [];
      graph.adminStartTime = adminStartTime;
      graph.timeOffset = playerTimeOffset;            //offset to adjust for clock difference between lab computers
      graph.timeSinceStart = 0;        //the amount of time since the start of the experiment in seconds
      graph.timePerPixel = 0;          // number of ms represented by one pixel
      graph.advanceTimeShown = 0;      // the amount of time shown to the right of the current time on the graph

      graph.priceRange = 10;

      graph.marketZoomLevel = 4;       // current zoom level for each graph
      graph.profitZoomLevel = 4;
      graph.maxZoomLevel = 4;          // maximum allowed zoom level
      graph.zoomAmount = 0;            // amount zoomed per click

      graph.expandedGraph = false;
      graph.prevMaxPriceMarket = 0;    // storage for previous max and min values for when graph is in expanded mode
      graph.prevMinPriceMarket = 0;
      graph.prevMaxPriceProfit = 0;
      graph.prevMinPriceProfit = 0;

      graph.currentTick = [];          //added 7/21/17 for drawing transaction lines
      graph.op = 1;                    //added 7/24/17 for adding opacity to transaction lines
      graph.currentTransaction = null;    //added 7/24/17 for ensuring only the correct orders are drawn as transacted
      graph.currTransactionID = null;     //added 7/24/17 for ensuring only the correct orders are drawn as transacted
      graph.heightScale = .4;          //added 7/26/17 to shift the height of the graph to fit buttons under
      graph.widthScale = 2;            //added 7/28/17 to widen the graphs of ticks to be better fit spread 
      graph.oldFundPrice = 0;
      graph.FPCop = 1;
      graph.currSpreadTick = 0;
      graph.startTime = 0;
      graph.tickAnimationID = 0;

      
         graph.getCurOffsetTime = function () {
            return getTime() - this.timeOffset;
      };

      graph.setExpandedGraph = function () {
         this.prevMaxPriceMarket = this.maxPriceMarket;
         this.prevMinPriceMarket = this.minPriceMarket;
         this.prevMaxPriceProfit = this.maxPriceProfit;
         this.prevMinPriceProfit = this.minPriceProfit;

         this.expandedGraph = true;
      };

      graph.setContractedGraph = function () {
         this.maxPriceMarket = this.prevMaxPriceMarket;
         this.minPriceMarket = this.prevMinPriceMarket;
         this.maxPriceProfit = this.prevMaxPriceProfit;
         this.minPriceProfit = this.prevMinPriceProfit;

         this.expandedGraph = false;
         this.timeInterval = this.contractedTimeInterval;
         this.timePerPixel = graph.timeInterval * 1000000000 / (graph.elementWidth - graph.axisLabelWidth - graph.graphPaddingRight);
         this.advanceTimeShown = graph.timePerPixel * (graph.axisLabelWidth + graph.graphPaddingRight);
      };

      graph.zoomMarket = function (zoomIn) {
         if (zoomIn && this.marketZoomLevel < this.maxZoomLevel) {
            this.maxPriceMarket -= this.zoomAmount;
            this.minPriceMarket += this.zoomAmount;
            this.marketZoomLevel++;
            this.marketPriceLines = this.calcPriceGridLines(this.maxPriceMarket, this.minPriceMarket, this.marketPriceGridIncrement);
         }
         else if (!zoomIn && this.marketZoomLevel > 0) {
            this.maxPriceMarket += this.zoomAmount;
            this.minPriceMarket -= this.zoomAmount;
            this.marketZoomLevel--;
            this.marketPriceLines = this.calcPriceGridLines(this.maxPriceMarket, this.minPriceMarket, this.marketPriceGridIncrement);
         }
      };

      graph.zoomProfit = function (zoomIn) {
         if (zoomIn && this.profitZoomLevel < this.maxZoomLevel) {
            this.maxPriceProfit -= this.zoomAmount;
            this.minPriceProfit += this.zoomAmount;
            this.profitZoomLevel++;
            this.profitPriceLines = this.calcPriceGridLines(this.maxPriceProfit, this.minPriceProfit, this.profitPriceGridIncrement);
         }
         else if (!zoomIn && this.profitZoomLevel > 0) {
            this.maxPriceProfit += this.zoomAmount;
            this.minPriceProfit -= this.zoomAmount;
            this.profitZoomLevel--;
            this.profitPriceLines = this.calcPriceGridLines(this.maxPriceProfit, this.minPriceProfit, this.profitPriceGridIncrement);
         }
      };

      graph.calculateSize = function () {
         this.elementWidth = $('#' + this.marketElementId).width();
         this.elementHeight = $('#' + this.marketElementId).height();
         this.profitElementWidth = $('#' + this.profitElementId).width();
         this.profitElementHeight = $('#' + this.profitElementId).height();
      };

      graph.mapProfitPriceToYAxis = function (price) {
         var percentOffset = (this.maxPriceProfit - price) / (this.maxPriceProfit - this.minPriceProfit);
         return this.profitElementHeight * percentOffset;      //changed 7/27/17 to fix profit graph
      };

      graph.mapMarketPriceToYAxis = function (price) {
         var percentOffset = (this.maxPriceMarket - price) / (this.maxPriceMarket - this.minPriceMarket);
         return this.elementHeight * percentOffset;
      };

      graph.mapTimeToXAxis = function (timeStamp) {
         var percentOffset;
         if (this.timeSinceStart >= this.timeInterval) {
            percentOffset = (timeStamp - (this.currentTime - (this.timeInterval * 1000000000))) / (this.timeInterval * 1000000000);
         }
         else {
            percentOffset = (timeStamp - this.adminStartTime) / (this.timeInterval * 1000000000);
         }
         return (this.profitElementWidth - this.axisLabelWidth - this.graphPaddingRight) * percentOffset;   //changed 7/27/17
      };

      graph.millisToTime = function (timeStamp) {
         var secs = (timeStamp - this.adminStartTime) / 1000000000;
         var mins = Math.trunc(secs / 60);
         secs %= 60;
         return mins + ":" + ("00" + secs).substr(-2, 2);
      };

      graph.calcPriceGridLines = function (maxPrice, minPrice, increment) {
         var gridLineVal = minPrice + increment - (minPrice % increment);
         // adjust for mod of negative numbers not being negative
         if(minPrice < 0) gridLineVal -= increment;
         var lines = [];
         while (gridLineVal < maxPrice) {
            lines.push(gridLineVal);
            gridLineVal += increment;
         }
         return lines;
      };

      graph.calcTimeGridLines = function (startTime, endTime, increment) {
         var timeLineVal = startTime - ((startTime - this.adminStartTime) % increment);
         var lines = [];
         while (timeLineVal < endTime) {
            lines.push(timeLineVal);
            timeLineVal += increment;
         }
         return lines;
      };

      graph.getTimeGridClass = function (timeStamp) {
         if (timeStamp % (this.timeIncrement * 2000000000) == 0)        //was 2000 7/28/17
            return "time-grid-box-light";
         else return "time-grid-box-dark";
      };

      graph.drawTimeGridLines = function (graphRefr, svgToUpdate) {
         //Draw rectangles for time grid lines
         svgToUpdate.selectAll("rect.time-grid-box-dark")
            .data(this.timeLines)
            .enter()
            .append("rect")
            .filter(function (d) {
               // only draw elements that are an even number of increments from the start
               return ((d - graphRefr.adminStartTime) / (graphRefr.timeIncrement * 1000000000)) % 2 == 0;      //was 1000 7/27/17
            })
            .attr("x", function (d) {
               return graphRefr.mapTimeToXAxis(d);
            })
            .attr("y", 0)
            .attr("width", this.timeIncrement / this.timeInterval * (this.profitElementWidth - this.axisLabelWidth - this.graphPaddingRight))   //changed 7/27/17 (width)
            .attr("height", this.profitElementHeight)
            .attr("class", "time-grid-box-dark");

         //Draw labels for time grid lines
         svgToUpdate.selectAll("text.time-grid-line-text")
            .data(this.timeLines)
            .enter()
            .append("text")
            .attr("text-anchor", "start")
            .attr("x", function (d) {
               return graphRefr.mapTimeToXAxis(d) + 5;
            })
            .attr("y", this.profitElementHeight - 5)
            .text(function (d) {
               return graphRefr.millisToTime(d)
            })
            .attr("class", "time-grid-line-text");
      };

      graph.drawPriceGridLines = function (graphRefr, priceLines, svgToUpdate, priceMapFunction) {
         //hack to fix problem with this not being set correctly for map function
         priceMapFunction = priceMapFunction.bind(graphRefr);

         //Draw the lines for the price grid lines
         svgToUpdate.selectAll("line.price-grid-line")
            .data(priceLines)
            .enter()
            .append("line")
            .attr("x1", 0)
            .attr("x2", this.profitElementWidth - this.axisLabelWidth)        //changed 7/27/17
            .attr("y1", function (d) {
               return priceMapFunction(d);
            })
            .attr("y2", function (d) {
               return priceMapFunction(d);
            })
            .attr("class", function (d) {
               return d != 0 ? "price-grid-line" : "price-grid-line-zero";
            });
      };

      //draws FP and offers
      graph.drawMarket = function (graphRefr, historyDataSet, currentData, styleClassName) {
         if (currentData != null) {
            this.marketSVG.append("line")
               .attr("x1", function(d) {
                     return styleClassName == "others-buy-offer" ? (graphRefr.elementWidth / 2 + 10) : (graphRefr.elementWidth / 2 + 20);
               })
               .attr("x2", function(d) {
                     return styleClassName == "others-buy-offer" ? (graphRefr.elementWidth / 2 - 10) : (graphRefr.elementWidth / 2 - 20);
               })
               .attr("y1", function(d) {
                     return graphRefr.elementHeight / 2 - (currentData * graphRefr.elementHeight / graphRefr.priceRange);
               })
               .attr("y2", function(d) {
                     return graphRefr.elementHeight / 2 - (currentData * graphRefr.elementHeight / graphRefr.priceRange);
               })
               
               .attr("class", styleClassName);
         }
      };

      //draws profit line
      graph.drawProfit = function (graphRefr, historyDataSet, currentData, outStyleClass, makerStyleClass, snipeStyleClass) {
         this.profitSVG.selectAll("line." + outStyleClass + " line." + makerStyleClass + " line." + snipeStyleClass)
            .data(historyDataSet, function (d) {
               return d;
            })
            .enter()
            .append("line")
            .filter(function (d) {
               return d[1] >= (graphRefr.currentTime - graphRefr.timeInterval * 1000000000);
            })
            .attr("x1", function (d) {
               return graphRefr.mapTimeToXAxis(d[0]);
            })
            .attr("x2", function (d) {
               return graphRefr.mapTimeToXAxis(d[1]);
            })
            .attr("y1", function (d) {
               return graphRefr.mapProfitPriceToYAxis(d[2]);
            })
            .attr("y2", function (d) {
               return graphRefr.mapProfitPriceToYAxis(d[3]);
            })
            .attr("class", function (d) {
               // a masterpiece
               return d[4] == "Out" ? outStyleClass : (d[4] == "Maker" ? makerStyleClass : snipeStyleClass);
            });

         if (currentData != null) {
            var pricefinal = currentData[1] - ((graphRefr.currentTime - currentData[0]) * currentData[2] / 1000000000); //determines how far down the line has moved
            this.profitSVG.append("line")
               .attr("x1", this.mapTimeToXAxis(currentData[0]))
               .attr("x2", this.curTimeX)
               .attr("y1", this.mapProfitPriceToYAxis(currentData[1]))
               .attr("y2", this.mapProfitPriceToYAxis(pricefinal))
               .attr("class", currentData[3] == "Out" ? outStyleClass : (currentData[3] == "Maker" ? makerStyleClass : snipeStyleClass));
         }
      };

      graph.drawOffers = function (graphRefr, dataHistory) {
         for (var user of dataHistory.group) {
            if (user !== dataHistory.myId && dataHistory.playerData[user].curBuyOffer !== null && dataHistory.playerData[user].curSellOffer !== null) {
               let p = Math.min(dataHistory.playerData[user].curSellOffer[1] - dataHistory.curFundPrice[1], dataHistory.curFundPrice[1] - dataHistory.playerData[user].curBuyOffer[1]) * graphRefr.widthScale;  //added width scale 7/27/17
               this.drawMarket(graphRefr, dataHistory.playerData[user].pastBuyOffers, p, "others-buy-offer");
               graphRefr.currentTick[user] = p;
            }
         }
         if (dataHistory.playerData[dataHistory.myId].curBuyOffer !== null && dataHistory.playerData[dataHistory.myId].curSellOffer !== null) {
            let p = Math.min(dataHistory.playerData[dataHistory.myId].curSellOffer[1] - dataHistory.curFundPrice[1], dataHistory.curFundPrice[1] - dataHistory.playerData[dataHistory.myId].curBuyOffer[1]) * graphRefr.widthScale;    //added width scale 7/27/17
            this.drawMarket(graphRefr, dataHistory.playerData[user].pastBuyOffers, p, "my-buy-offer");
            graphRefr.currentTick[user] = p;
         }
      };

      graph.drawTransactions = function (graphRefr, historyDataSet, myId) {
         graphRefr.marketSVG.selectAll("line.my-positive-transactions line.my-negative-transactions line.other-transactions")
            .data(historyDataSet)
            .enter()
            .append("line")
            .attr("opacity", graphRefr.op)
            .attr("x1", graphRefr.elementWidth / 2)
            .attr("x2", graphRefr.elementWidth / 2)
            .attr("y1", graphRefr.elementHeight / 2)
            .attr("y2", function (d) {
               if(graphRefr.currentTransaction == null) graphRefr.currentTransaction = graphRefr.currentTick[d.subjectID];
               if(graphRefr.currTransactionID == null) graphRefr.currTransactionID = d.msgId;

               if(graphRefr.currentTick[d.subjectID] != graphRefr.currentTransaction && graphRefr.currTransactionID == d.msgId){                //The user's tick shifted from a FPC, but hasnt transacted
                  graphRefr.op -= .05; 
                  return graphRefr.elementHeight / 2 - (graphRefr.currentTransaction * graphRefr.elementHeight / graphRefr.priceRange);           //Let old transaction line fade out at same spot
               }  
               else if(graphRefr.currentTick[d.subjectID] != graphRefr.currentTransaction && graphRefr.currTransactionID != d.msgId){           //The user's tick shifted from a FPC and immediately transacted
                  graphRefr.currTransactionID = d.msgId;                                                                                        //update variable saving msgID of current transaction
                  graphRefr.currentTransaction = graphRefr.currentTick[d.subjectID];                                                            //update variable saving current tick location
                  graphRefr.op = 1;                                                                                                             //reset the opacity
                  return graphRefr.elementHeight / 2 - (graphRefr.currentTick[d.subjectID] * graphRefr.elementHeight / graphRefr.priceRange);     //Let old transaction line fade out at same spot
               }
               else if(graphRefr.currentTick[d.subjectID] == graphRefr.currentTransaction && graphRefr.currTransactionID != d.msgId){           //Redraw the transaction line at the same point
                  graphRefr.op = 1;                                                                                                             //reset the opacity
                  graphRefr.currTransactionID = d.msgId;                                                                                        //update msgID
               }
               else{//currentTick[d.subjectID] == this.currentTransaction && this.currTransactionID == d.msgID                                  //No FPC, so continue to graph user's transaction
                  graphRefr.op -= .05;                                                                                                          //Decrement opacity to let line fade
                  return graphRefr.elementHeight / 2 - (graphRefr.currentTick[d.subjectID] * graphRefr.elementHeight / graphRefr.priceRange);
               }
            })
            .attr("class", function (d) {
               if (d.buyerID == myId) {
                  return d.FPC - d.price > 0 ? "my-positive-transactions" : "my-negative-transactions";
               }
               else if (d.sellerID == myId) {
                  return d.price - d.FPC > 0 ? "my-positive-transactions" : "my-negative-transactions";
               }
               else return "other-transactions";
            })
      };
      graph.drawFundamentalValue = function (graphRefr, dataHistory) {  //append a flashing yellow line every jump
         this.marketSVG.append("line")
            .attr("opacity", graphRefr.FPCop)
            .attr("x1", this.elementWidth / 2 - 30)
            .attr("x2", this.elementWidth / 2 + 30)
            .attr("y1", this.elementHeight / 2)// * graphRefr.heightScale - 30)
            .attr("y2", this.elementHeight / 2)// * graphRefr.heightScale + 30)
            .attr("class", function (d) {
               graphRefr.FPCop -= .05;
               return "my-fpc-flash";
            })
      };

      graph.callDrawSpreadTick = function (rawSpread, speed){         
         graph.startTime = window.performance.now();          //this is the timestamp format that rAF returns
         if(speed){
            this.DrawSpreadTick(this, rawSpread, dataHistory.myId, window.performance.now(), this.elementWidth / 2, 50);  //move tick over QUICKLY
         }
         else{
            this.DrawSpreadTick(this, rawSpread, dataHistory.myId, window.performance.now(), this.elementWidth / 2, 1000);  //move tick over in 500ms
         }
      };

      graph.DrawSpreadTick = function (graphRefr, rawSpread, myId, timestamp, distance, duration) {            //draws a tick where the user clicks on the 
         if(dataHistory.playerData[myId].state != "Snipe" || dataHistory.playerData[myId].state != "Out"){
            var runtime = timestamp - graph.startTime;                //time since tick was first drawn
            var progress = Math.min(runtime / duration, 1);           //percentage of duration ms

            this.marketSVG.append("line")
               .attr("opacity", .5)
               .attr("x1", function (d) {
                  return (graphRefr.elementWidth / 2 - 20) + distance - (distance * progress).toFixed(2);    //same height as my offer
               })
               .attr("x2", function(d) {
                  return graphRefr.elementWidth / 2 + 20 + distance - (distance * progress).toFixed(2);
               })
               .attr("y1", function (d) {
                  if(rawSpread >= graphRefr.elementHeight / 2){        //dont want a "negative" spread
                     return graphRefr.elementHeight / 2 - 1;           //+1 for "minimum visual spread"
                  }
                  else{
                     return rawSpread;
                  } 
               })
               .attr("y2", function (d) {
                  if(rawSpread >= graphRefr.elementHeight / 2){        //dont want a "negative" spread
                     return graphRefr.elementHeight / 2 - 1;           //+1 for "minimum visual spread"
                  }
                  else{
                     return rawSpread;
                  }
               })
               .attr("class", "my-buy-offer")
            }
            if(runtime < duration){                                     //move until duration completed
               graph.tickAnimationID = requestAnimationFrame(function (timestamp){
                  graph.DrawSpreadTick(graphRefr, rawSpread, myId, timestamp, distance, duration);  //300 pixels over 500ms  
               }); 
            }
            else{
               graph.tickAnimationID = requestAnimationFrame(function (timestamp){
                  graph.DrawSpreadTick(graphRefr, rawSpread, myId, timestamp, 0, 0);  //300 pixels over 500ms  
               }); 
            }
           
      };



      graph.drawAllProfit = function (graphRefr, dataHistory) {
         for (var user of dataHistory.group) {
            if (user !== dataHistory.myId) {
               this.drawProfit(graphRefr, dataHistory.playerData[user].pastProfitSegments, dataHistory.playerData[user].curProfitSegment, "others-profit-out", "others-profit-maker", "others-profit-snipe");
            }
         }
         this.drawProfit(graphRefr, dataHistory.playerData[dataHistory.myId].pastProfitSegments, dataHistory.playerData[dataHistory.myId].curProfitSegment, "my-profit-out", "my-profit-maker", "my-profit-snipe");
      };

      graph.drawPriceAxis = function (graphRefr, priceLines, svgToUpdate, priceMapFunction) {
         //hack to fix problem with this not being set correctly for map function
         priceMapFunction = priceMapFunction.bind(graphRefr);

         //Draw the text that goes along with the price gridlines and axis
         svgToUpdate.selectAll("text.price-grid-line-text")
            .data(priceLines)
            .enter()
            .append("text")
            .attr("text-anchor", "start")
            .attr("x", this.profitElementWidth - this.axisLabelWidth + 12)    //changed 7/27/17
            .attr("y", function (d) {  
               return priceMapFunction(d) + 3;
            })
            .attr("class", "price-grid-line-text")
            .text(function (d) {
               return d;
            });
      };

      

      graph.calcPriceBounds = function (dHistory) {
         // calc bounds for market graph
         // check to see if current FP is outside of middle 80% of screen
         if (dHistory.curFundPrice[1] > (.2 * this.minPriceMarket) + (.8 * this.maxPriceMarket) ||
             dHistory.curFundPrice[1] < (.8 * this.minPriceMarket) + (.2 * this.maxPriceMarket)) {
            this.centerPriceMarket = dHistory.curFundPrice[1];
         }

         var curCenterMarket = (this.maxPriceMarket + this.minPriceMarket) / 2;

         if (Math.abs(this.centerPriceMarket - curCenterMarket) > 1) {
            this.marketPriceLines = this.calcPriceGridLines(this.maxPriceMarket, this.minPriceMarket, this.marketPriceGridIncrement);
            if (this.centerPriceMarket > curCenterMarket) {
               this.maxPriceMarket += this.graphAdjustSpeedMarket;
               this.minPriceMarket += this.graphAdjustSpeedMarket;
            }
            else {
               this.maxPriceMarket -= this.graphAdjustSpeedMarket;
               this.minPriceMarket -= this.graphAdjustSpeedMarket;
            }
         }

         //calc bounds for profit graph

         if (dHistory.profit > (.2 * this.minPriceProfit) + (.8 * this.maxPriceProfit) ||
             dHistory.profit < (.8 * this.minPriceProfit) + (.2 * this.maxPriceProfit)) {
            this.centerPriceProfit = dHistory.profit;
         }

         var curCenterProfit = (this.maxPriceProfit + this.minPriceProfit) / 2;

         if (Math.abs(this.centerPriceProfit - curCenterProfit) > 1) {
            this.profitPriceLines = this.calcPriceGridLines(this.maxPriceProfit, this.minPriceProfit, this.profitPriceGridIncrement);
            if (this.centerPriceProfit > curCenterProfit) {
               this.maxPriceProfit += this.graphAdjustSpeedProfit;
               this.minPriceProfit += this.graphAdjustSpeedProfit;
            }
            else {
               this.maxPriceProfit -= this.graphAdjustSpeedProfit;
               this.minPriceProfit -= this.graphAdjustSpeedProfit;
            }
         }
      };

      graph.draw = function (dataHistory) {
         //Clear the svg elements
         this.marketSVG.selectAll("*").remove();
         this.profitSVG.selectAll("*").remove();

         var graphRefr = this;

         this.currentTime = this.getCurOffsetTime();
         this.timeSinceStart = (this.currentTime - dataHistory.startTime) / 1000000000;
         if (this.expandedGraph) {
            this.timeInterval = this.timeSinceStart;
            this.timePerPixel = this.timeInterval * 1000000000 / (this.elementWidth - this.axisLabelWidth - this.graphPaddingRight);
            this.advanceTimeShown = this.timePerPixel * (this.axisLabelWidth + this.graphPaddingRight);

            this.maxPriceMarket = Math.max(dataHistory.highestMarketPrice + 1, this.prevMaxPriceMarket);
            this.minPriceMarket = Math.min(dataHistory.lowestMarketPrice - 1, this.prevMinPriceMarket);
            this.maxPriceProfit = Math.max(dataHistory.highestProfitPrice + 1, this.prevMaxPriceProfit);
            this.minPriceProfit = Math.min(dataHistory.lowestProfitPrice - 1, this.prevMinPriceProfit);
         }

         this.curTimeX = this.mapTimeToXAxis(this.currentTime);

         // recalculate market price bounds
         this.calcPriceBounds(dataHistory);

         //Check if it is necessary to recalculate timeLines
         // recalculate if right edge of graph is more than a batch length past last batch line
         // or if left edge is more than a batch length past first batch line
         // Math.max expression finds time at left edge of screen
         if (this.currentTime + this.advanceTimeShown > this.timeLines[this.timeLines.length - 1] + this.timeIncrement ||
             Math.max(this.adminStartTime, this.currentTime - this.timeInterval * 1000000000) < this.timeLines[0] - this.timeIncrement) {
            this.timeLines = this.calcTimeGridLines(this.currentTime - this.timeInterval * 1000000000, this.currentTime + this.advanceTimeShown, this.timeIncrement * 1000000000);
         }

         //Invoke all of the draw functions
         //this.drawTimeGridLines(graphRefr, this.marketSVG);
         this.drawTimeGridLines(graphRefr, this.profitSVG);

         //this.drawPriceGridLines(graphRefr, this.marketPriceLines, this.marketSVG, this.mapMarketPriceToYAxis);
         this.drawPriceGridLines(graphRefr, this.profitPriceLines, this.profitSVG, this.mapProfitPriceToYAxis);

         // draw vertical center line
         this.marketSVG.append("line").attr({
               x1: this.elementWidth / 2,
               x2: this.elementWidth / 2,
               y1: 0, 
               y2: this.elementHeight, //this.elementHeight / 2,
               class: "price-line"
            });

         // // draw static current price tick
         this.marketSVG.append("line").attr({
               x1: this.elementWidth / 2 - 30,
               x2: this.elementWidth / 2 + 30,
               y1: this.elementHeight / 2,// * graphRefr.heightScale - 30,//this.elementHeight / 2 - 30,//- 10,    //changed 7/26/17
               y2: this.elementHeight / 2,//* graphRefr.heightScale + 30,//this.elementHeight / 2 + 30,//+ 10,
               class: "my-profit-out"
            });

         this.drawOffers(graphRefr, dataHistory);
         
         if(this.oldFundPrice != dataHistory.curFundPrice[1]){               //the value jumped, draw the yellow line
            if(this.FPCop > 0){
               this.drawFundamentalValue(graphRefr, dataHistory);
            }
            else{
               this.oldFundPrice = dataHistory.curFundPrice[1];                 //update our checker
               this.FPCop = 1;            
            }                                     //reset opacity
         }

         //this.DrawSpreadTick(graphRefr, this.currSpreadTick, dataHistory.myId);                 //draws where the user clicks on the graph

         //this.drawMarket(graphRefr, dataHistory.pastFundPrices, dataHistory.curFundPrice, "price-line");
         this.drawTransactions(graphRefr, dataHistory.transactions, dataHistory.myId);
         //this.drawPriceAxis(graphRefr, this.marketPriceLines, this.marketSVG, this.mapMarketPriceToYAxis);
         this.drawPriceAxis(graphRefr, this.profitPriceLines, this.profitSVG, this.mapProfitPriceToYAxis);

         this.drawAllProfit(graphRefr, dataHistory);
      };

      graph.init = function (startFP, maxSpread, startingWealth) {
         // set price bounds for both graphs
         this.maxPriceMarket = startFP + maxSpread;
         this.minPriceMarket = startFP - maxSpread;
         this.centerPriceMarket = (this.maxPriceMarket + this.minPriceMarket) / 2;
         this.maxPriceProfit = startingWealth + maxSpread;
         this.minPriceProfit = startingWealth - maxSpread;
         this.centerPriceProfit = (graph.maxPriceProfit + graph.minPriceProfit) / 2;

         this.calculateSize();
         this.timePerPixel = graph.timeInterval * 1000 / (graph.profitElementWidth - graph.axisLabelWidth - graph.graphPaddingRight);     //changed 7/27/17
         this.advanceTimeShown = graph.timePerPixel * (graph.axisLabelWidth + graph.graphPaddingRight);

         this.zoomAmount = maxSpread / 2;

         this.marketPriceLines = this.calcPriceGridLines(this.maxPriceMarket, this.minPriceMarket, this.marketPriceGridIncrement);
         this.profitPriceLines = this.calcPriceGridLines(this.maxPriceProfit, this.minPriceProfit, this.profitPriceGridIncrement);
         this.timeLines = this.calcTimeGridLines(this.adminStartTime, this.adminStartTime + this.timeInterval * 1000000000 + this.advanceTimeShown, this.timeIncrement * 1000000000);
      };

      return graph;
   };


   return api;

});
