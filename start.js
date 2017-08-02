RedwoodHighFrequencyTrading.controller("HFTStartController",
   ["$scope",
      '$interval',
      "RedwoodSubject",
      "DataHistory",
      "Graphing",
      "$http",
      function ($scope, $interval, rs, dataHistory, graphing, $http) {

         var CLOCK_FREQUENCY = 50;   // Frequency of loop, measured in ms delay between ticks

         $scope.sliderVal = 0;
         $scope.state = "state_out";
         $scope.using_speed = false;
         $scope.spread = 0;
         $scope.maxSpread = 1;
         $scope.lastTime = 0;          // the last time that the update loop ran. used for calculating profit decreases.
         $scope.mousePressed = false;
         $scope.animationID = null;
         $scope.oldOffsetY = null;
         $scope.oldUsingSpeed = 0;
         $scope.overWriteID = [];
         $scope.curOffsetY = null;
         $scope.startTime = 0;
         $scope.removeStartTime = 0;
         $scope.offsetX = 0;

         $scope.s = {
            NO_LINES: 0,
            DRAW_FIRST: 1,
            FIRST_DRAWN: 2,
            DRAW_SECOND: 3,
            SECOND_DRAWN: 4
         };

         $scope.e = {
            NO_EVENT: 0,
            JUMP: 1,
            CLICK: 2,
            TIMEOUT: 3
         };

         $scope.event = $scope.e.NO_EVENT;
         $scope.tickState = $scope.s.NO_LINES;

         //Loops at speed CLOCK_FREQUENCY in Hz, updates the graph
         $scope.update = function (timestamp) {
            $scope.FSM($scope.tickState, $scope.event, timestamp);

            $scope.tradingGraph.draw($scope.dHistory);

            if ($scope.using_speed) {
               $scope.dHistory.profit -= (getTime() - $scope.lastTime) * $scope.dHistory.speedCost / 1000000000;
            }
            $scope.lastTime = getTime();
            requestAnimationFrame($scope.update);
         };

         // Sends a message to the Group Manager
         $scope.sendToGroupManager = function (msg, delay) {
            if ($scope.isDebug) {
               $scope.logger.logSend(msg, "Group Manager");
            }
            $scope.dHistory.CalculatePlayerInfo();
            rs.send("To_Group_Manager", msg);
         };

         

         //First function to run when page is loaded
         rs.on_load(function () {
            rs.send("set_player_time_offset", getTime());
            rs.send("Subject_Ready");
         });

         //Initializes experiment
         rs.recv("Experiment_Begin", function (uid, data) {
            $scope.groupNum = data.groupNumber;
            $scope.group = data.group;
            $scope.maxSpread = data.maxSpread;
            $scope.sliderVal = $scope.maxSpread / 2;
            $scope.spread = $scope.maxSpread / 2;
            $("#slider")
               .slider({
                  value: $scope.sliderVal,
                  max: $scope.maxSpread
               });

            // create associative array to go from uid to local group id for display purposes
            $scope.displayId = {};
            for (var index = 0; index < data.group.length; index++) {
               $scope.displayId[data.group[index]] = index + 1;
            }

            //Create the logger for this start.js page
            $scope.isDebug = data.isDebug;
            if ($scope.isDebug) {
               $("#ui").append('<div class="terminal-wrap"><div class="terminal-head">Subject Message Log</div><div id="subject-log" class="terminal"></div></div>');
               $scope.logger = new MessageLogger("Subject Manager " + String(rs.user_id), "yellow", "subject-log");
            }

            //Create data history and graph objects
            $scope.dHistory = dataHistory.createDataHistory(data.startTime, data.startFP, rs.user_id, $scope.group, $scope.isDebug, data.speedCost, data.startingWealth, data.maxSpread);
            $scope.dHistory.init();
            $scope.tradingGraph = graphing.makeTradingGraph("graph1", "graph2", data.startTime, data.playerTimeOffsets[rs.user_id]);
            $scope.tradingGraph.init(data.startFP, data.maxSpread, data.startingWealth);

            // set last time and start looping the update function
            $scope.lastTime = getTime();
            // $interval($scope.update, CLOCK_FREQUENCY);
            requestAnimationFrame($scope.update);                 //added 7/31/17 for smoother graphing
            // if input data was provided, setup automatic input system
            if (data.hasOwnProperty("input_addresses")) {
               // get unique index for this player
               var index = $scope.group.findIndex(function (element) { return element == rs.user_id; });

               // download input csv file
               $http.get(data.input_addresses[index]).then(function (response) {
                  // parse input into array
                  $scope.inputData = response.data.split('\n').map(function (element) {
                     return element.split(',');
                  });
                  var delay = $scope.inputData[0][0] + ($scope.dHistory.startTime - $scope.tradingGraph.getCurOffsetTime())/1000000;
                  console.log("delay: " + delay);
                  window.setTimeout($scope.processInputAction, delay, 0);
               });
            }
         });

         rs.recv("From_Group_Manager", function (uid, msg) {
            handleMsgFromGM(msg);
         });

         $scope.setSpeed = function (value) {
            if (value !== $scope.using_speed) {
               $scope.using_speed = value;
               var msg = new Message("USER", "USPEED", [rs.user_id, $scope.using_speed, $scope.tradingGraph.getCurOffsetTime()]);
               $scope.sendToGroupManager(msg);
            }
         };

         $("#speed-switch")
            .click(function () {
               $scope.setSpeed(this.checked);
            });

         $("#slider-val")
            .change( function () {
               var newVal = $(this).val();

               // if someone tries to enter an empty value or a spread larger than the max spread
               if (newVal == "" || newVal > $scope.maxSpread || newVal < 0) {
                  $(this).val($scope.sliderVal);
                  return;
               }

               if (newVal != $scope.spread) {
                  $scope.sliderVal = newVal;
                  $scope.spread = newVal;
                  $("#slider").slider({value: newVal});
                  var msg = new Message("USER", "UUSPR", [rs.user_id, $scope.sliderVal, $scope.tradingGraph.getCurOffsetTime()]);
                  $scope.sendToGroupManager(msg);
               }
               if ($scope.state != "state_maker") {
                  var msg2 = new Message("USER", "UMAKER", [rs.user_id, $scope.tradingGraph.getCurOffsetTime()]);
                  $scope.sendToGroupManager(msg2);
                  $scope.setState("state_maker");
               }
            });

         $scope.CalculateXPOS = function (runtime){        //for implementation purposes, both fast and slow lines take the whole width
            if($scope.using_speed){        
               $scope.tradingGraph.elementWidth - ($scope.tradingGraph.elementWidth * Math.min(runtime / $scope.tradingGraph.fastDelay, 1)).toFixed(2);
            }
            else{             
               return $scope.tradingGraph.elementWidth - ($scope.tradingGraph.elementWidth * Math.min(runtime / $scope.tradingGraph.slowDelay, 1)).toFixed(2);
            }
         };  

         $scope.FSM = function (state, event, timestamp) {
            switch(state){ 
               case $scope.s.NO_LINES:
                  switch(event){ 
                     case $scope.e.CLICK:                                                       //user's first click on the graph
                        $scope.startTime = window.performance.now();                            //reset start time for the new line1
                        $scope.tradingGraph.callDrawSpreadTick($scope.curOffsetY, $scope.using_speed, event, timestamp - $scope.startTime, false, "line1");
                        $scope.oldOffsetY = $scope.curOffsetY;                                  //save our Y position for the next receding line
                        $scope.event = $scope.e.NO_EVENT;                                       //clear event
                        $scope.tickState = $scope.s.DRAW_FIRST;                                 //transition to DRAW_FIRST
                        break;

                     default:
                        console.log("pay jason more");
                        break;
                  }
                  break;
               case $scope.s.DRAW_FIRST:
                  switch(event){
                     case $scope.e.CLICK:                                                       //user clicked before line1 was fully drawn
                        $scope.offsetX = $scope.CalculateXPOS(timestamp - $scope.startTime);    //calculate the x offset before startTime is reset
                        $scope.removeStartTime = $scope.startTime;                              //receding line will continue from old startTime
                        $scope.startTime = window.performance.now();                            //reset start time for the new line2
                        $scope.tradingGraph.callDrawSpreadTick($scope.curOffsetY, $scope.using_speed, event, timestamp - $scope.startTime, false, "line2", false);                         //draw new line2
                        $scope.tradingGraph.callDrawSpreadTick($scope.oldOffsetY, $scope.using_speed, event, timestamp - $scope.removeStartTime, false, "line3", true, $scope.offsetX);    //insert receding line3 @ old y position
                        $scope.tradingGraph.marketSVG.selectAll("#line1").remove();             //line1 has been replaced by line3
                        $scope.event = $scope.e.NO_EVENT;                                       //clear event
                        $scope.tickState = $scope.s.DRAW_SECOND;                                //transition to DRAW_SECOND
                        break;

                     case $scope.e.JUMP:
                     
                        break;

                     default:                                                                   //no event, so continue drawing the line
                        if($scope.using_speed){
                           if(timestamp - $scope.startTime < $scope.tradingGraph.fastDelay){    //line1 hasnt reached the end
                              $scope.tradingGraph.callDrawSpreadTick($scope.curOffsetY, $scope.using_speed, event, timestamp - $scope.startTime, false, "line1", false);                         //continue drawing current spread
                              $scope.tradingGraph.callDrawSpreadTick($scope.oldOffsetY, $scope.using_speed, event, timestamp - $scope.removeStartTime, false, "line3", true, $scope.offsetX);    //continue drawing receding line3
                           }
                           else{                                                                //line1 reached the end
                              $scope.tradingGraph.marketSVG.selectAll("#line3").remove();       //safely delete receding line
                              $scope.oldOffsetY = $scope.curOffsetY;                            //save a new offset for the next receding line
                              $scope.tickState = $scope.s.FIRST_DRAWN;                          //transition to FIRST_DRAWN
                           }
                        }
                        else {                                                                  //no event, so continue drawing the line
                           if(timestamp - $scope.startTime < $scope.tradingGraph.slowDelay){    //line1 hasnt reached the end 
                              $scope.tradingGraph.callDrawSpreadTick($scope.curOffsetY, $scope.using_speed, event, timestamp - $scope.startTime, false, "line1", false);                         //continue drawing current spread
                              $scope.tradingGraph.callDrawSpreadTick($scope.oldOffsetY, $scope.using_speed, event, timestamp - $scope.removeStartTime, false, "line3", true, $scope.offsetX);    //continue drawing receing line 3
                           }
                           else{                                                                //line1 reached the end
                              $scope.tradingGraph.marketSVG.selectAll("#line3").remove();       //safely delete receding line
                              $scope.oldOffsetY = $scope.curOffsetY;                            //save a new offset for the next receding line
                              $scope.tickState = $scope.s.FIRST_DRAWN;                          //line drawn without another event -> transition to FIRST_DRAWN
                           }
                        }
                        
                        break;
                  }
                  break;
               case $scope.s.FIRST_DRAWN:
                  switch(event){
                     case $scope.e.CLICK:                                                       //user clicked once line1 was fully drawn
                        $scope.startTime = window.performance.now();                            //reset start time for the new line2
                        $scope.tradingGraph.callDrawSpreadTick($scope.curOffsetY, $scope.using_speed, event, timestamp - $scope.startTime, false, "line2", false);                     
                        $scope.tradingGraph.marketSVG.selectAll("#line1").remove();
                        $scope.event = $scope.e.NO_EVENT;                                       //clear event   
                        $scope.tickState = $scope.s.DRAW_SECOND;                                //transition to DRAW_SECOND 
                        break;

                     case $scope.e.JUMP:

                        break;

                     default:
                        $scope.tradingGraph.callDrawSpreadTick($scope.curOffsetY, $scope.using_speed, event, timestamp - $scope.startTime, true, "line1", false); 
                        break;
                  }
                  break;
               case $scope.s.DRAW_SECOND:
                  switch(event){
                     case $scope.e.CLICK:                                                       //user clicked before the line was fully drawn
                        $scope.tradingGraph.marketSVG.selectAll("#line3").remove();             //user clicked while a receding line was being drawn
                        $scope.oldOffsetY = $scope.curOffsetY;                                  //save a new offset for the next receding line
                        $scope.offsetX = $scope.CalculateXPOS(timestamp - $scope.startTime);    //calculate the x offset before time is reset
                        $scope.removeStartTime = $scope.startTime;                              //continutation of the previous time
                        $scope.startTime = window.performance.now();                            //reset start time for the new line1
                        $scope.tradingGraph.callDrawSpreadTick($scope.curOffsetY, $scope.using_speed, event, timestamp - $scope.startTime, false, "line1", false);                         //draw the most recent line  
                        $scope.tradingGraph.callDrawSpreadTick($scope.oldOffsetY, $scope.using_speed, event, timestamp - $scope.removeStartTime, false, "line3", true, $scope.offsetX);    //insert receding line3 @ old y position
                        $scope.tradingGraph.marketSVG.selectAll("#line2").remove();             //cancel the last line
                        $scope.event = $scope.e.NO_EVENT;                                       //clear event
                        $scope.tickState = $scope.s.DRAW_FIRST;                                 //transition to DRAW_FIRST
                        break;

                     case $scope.e.JUMP:

                        break;

                     default:
                        if($scope.using_speed){
                           if(timestamp - $scope.startTime < $scope.tradingGraph.fastDelay){
                              $scope.tradingGraph.callDrawSpreadTick($scope.curOffsetY, $scope.using_speed, event, timestamp - $scope.startTime, false, "line2", false);                         //continue drawing line 2
                              $scope.tradingGraph.callDrawSpreadTick($scope.oldOffsetY, $scope.using_speed, event, timestamp - $scope.removeStartTime, false, "line3", true, $scope.offsetX);    //insert receding line3 @ old y position
                           }
                           else{
                              $scope.tradingGraph.marketSVG.selectAll("#line3").remove();       //safely delete receding line
                              $scope.oldOffsetY = $scope.curOffsetY;                            //save a new offset for the next receding line
                              $scope.tickState = $scope.s.SECOND_DRAWN;                         //duration expired without another event -> transition to SECOND_DRAWN
                           }
                        }
                        else{
                           if(timestamp - $scope.startTime < $scope.tradingGraph.slowDelay){
                              $scope.tradingGraph.callDrawSpreadTick($scope.curOffsetY, $scope.using_speed, event, timestamp - $scope.startTime, false, "line2", false);
                              $scope.tradingGraph.callDrawSpreadTick($scope.oldOffsetY, $scope.using_speed, event, timestamp - $scope.removeStartTime, false, "line3", true, $scope.offsetX);    //insert receding line3 @ old y position
                           }
                           else{
                              $scope.tradingGraph.marketSVG.selectAll("#line3").remove();       //safely delete receding line
                              $scope.oldOffsetY = $scope.curOffsetY;                            //save a new offset for the next receding line
                              $scope.tickState = $scope.s.SECOND_DRAWN;                         //duration expired without another event -> transition to SECOND_DRAWN
                           }
                        }
                        
                        break;
                  }
                  break;

               case $scope.s.SECOND_DRAWN:                                 //user clicked once a line was drawn
                  switch(event){
                     case $scope.e.CLICK:
                        $scope.startTime = window.performance.now();       //draw line1 @ mouse pointer
                        $scope.tradingGraph.callDrawSpreadTick($scope.curOffsetY, $scope.using_speed, event, timestamp - $scope.startTime, false, "line1");
                        $scope.tradingGraph.marketSVG.selectAll("#line2").remove();
                        $scope.event = $scope.e.NO_EVENT;                  //clear event   
                        $scope.tickState = $scope.s.DRAW_FIRST;           //transition to DRAW_FIRST 
                        break;

                     case $scope.e.JUMP:
                     
                        break;

                     default:
                        $scope.tradingGraph.callDrawSpreadTick($scope.curOffsetY, $scope.using_speed, event, timestamp - $scope.startTime, true, "line2");
                        break;      
                  }
                  break;         

               default:
                  console.log("in default state");
                  break;
            }
         };

         $("#graph1")
            .mousedown( function(event) {
               $scope.mousePressed = true;                                       //set the flag so in case we leave the svg element we know it was a press
               if ($scope.state != "state_maker") {
                     var msg = new Message("USER", "UMAKER", [rs.user_id, $scope.tradingGraph.getCurOffsetTime()]);
                     $scope.sendToGroupManager(msg);
                     $scope.setState("state_maker");
               }  
            })
            .mouseleave( function(event) {
               if ($scope.mousePressed) {                                        //only set the spread if svg has been clicked on
                  $scope.mousePressed = false;                                   //reset the flag
                  if (event.offsetY <= $scope.tradingGraph.elementHeight / 2) {      //you left the svg right of the center tick
                     $scope.spread = (5 - Math.abs(10 * event.offsetY / $scope.tradingGraph.elementHeight)).toPrecision(2); //.1 increments
                     if($scope.spread > 5){
                        $scope.spread = 5;                                       //cap max spread to 5
                     }
                  } 
                  else {                                                            //you clicked left of the center tick
                     $scope.spread = 0.1;                                             // min spread subject to future changes
                  }
                  var msg = new Message("USER", "UUSPR", [rs.user_id, $scope.spread, $scope.tradingGraph.getCurOffsetTime()]);
                  $scope.sendToGroupManager(msg);
                  $scope.tradingGraph.currSpreadTick = event.offsetY;            //sets the location to be graphed

                  $scope.curOffsetY = event.offsetY;                             //set event to be handled in FSM
                  $scope.event = $scope.e.CLICK;
               }
            })
            .mouseup( function(event) {
               $scope.mousePressed = false;                                      //reset the flag
               if (event.offsetY <= $scope.tradingGraph.elementHeight / 2) {      //you clicked right of the center tick
                  $scope.spread = (5 - Math.abs(10 * event.offsetY / $scope.tradingGraph.elementHeight)).toPrecision(2); //.1 increments
                  if($scope.spread > 5){
                     $scope.spread = 5;                                          //cap max spread to 5
                  }
               } 
               else {                                                            //you clicked left of the center tick
                  $scope.spread = 0.1;                                             // min spread subject to future changes
               }
               var msg = new Message("USER", "UUSPR", [rs.user_id, $scope.spread, $scope.tradingGraph.getCurOffsetTime()]);
               $scope.sendToGroupManager(msg);
               $scope.tradingGraph.currSpreadTick = event.offsetY;               //sets the location to be graphed
               
               $scope.curOffsetY = event.offsetY;                                //set event to be handled in FSM
               $scope.event = $scope.e.CLICK;
            });


         $("#slider")
            .slider({
               orientation: "horizontal",
               step: .01,
               range: "min",
               slide: function (event, ui) {
                  $scope.sliderVal = ui.value;
               },
               stop: function () {
                  if ($scope.sliderVal != $scope.spread) {
                     $scope.spread = $scope.sliderVal;
                     var msg = new Message("USER", "UUSPR", [rs.user_id, $scope.spread, $scope.tradingGraph.getCurOffsetTime()]);
                     $scope.sendToGroupManager(msg);
                  }
               },
               start: function (event, ui) {
                  if ($scope.state != "state_maker") {
                     var msg = new Message("USER", "UMAKER", [rs.user_id, $scope.tradingGraph.getCurOffsetTime()]);
                     $scope.sendToGroupManager(msg);
                     $scope.setState("state_maker");
                  }
               }
            });

         // button for setting state to sniper
         $("#state_snipe")
            .addClass("state-not-selected")
            .button()
            .click(function (event) {
               var msg = new Message("USER", "USNIPE", [rs.user_id, $scope.tradingGraph.getCurOffsetTime()]);
               $scope.sendToGroupManager(msg);
               $scope.setState("state_snipe");
            });

         // button for setting state to market maker
         $("#state_maker")
            .addClass("state-not-selected")
            .button()
            .click(function (event) {
               var msg = new Message("USER", "UMAKER", [rs.user_id, $scope.tradingGraph.getCurOffsetTime()]);
               $scope.sendToGroupManager(msg);
               $scope.setState("state_maker");
            });

         // button for setting state to "out of market"
         $("#state_out")
            .addClass("state-selected")
            .button()
            .click(function (event) {
               $scope.setSpeed(false);
               $("#speed-switch").prop("checked", false);

               var msg = new Message("USER", "UOUT", [rs.user_id, $scope.tradingGraph.getCurOffsetTime()]);
               $scope.sendToGroupManager(msg);
               $scope.setState("state_out");
            });

         $("#expand-graph")
            .button()
            .click(function () {
               $scope.tradingGraph.setExpandedGraph();
            });

         $("#contract-graph")
            .button()
            .click(function () {
               $scope.tradingGraph.setContractedGraph();
            });

         $("#market-zoom-in")
            .click(function () {
               $scope.tradingGraph.zoomMarket(true);
            });

         $("#market-zoom-out")
            .click(function () {
               $scope.tradingGraph.zoomMarket(false);
            });

         $("#profit-zoom-in")
            .click(function () {
               $scope.tradingGraph.zoomProfit(true);
            });

         $("#profit-zoom-out")
            .click(function () {
               $scope.tradingGraph.zoomProfit(false);
            });

         $scope.setState = function (newState) {
            $("#" + $scope.state).removeClass("state-selected").addClass("state-not-selected");
            $scope.state = newState;
            $("#" + $scope.state).removeClass("state-not-selected").addClass("state-selected");
         };

         // receive message from market algorithm to the data history object
         rs.recv("To_Data_History_" + String(rs.user_id), function (uid, msg) {
            if ($scope.isDebug) {
               $scope.logger.logRecv(msg, "Market Algorithm");
            }
            $scope.dHistory.recvMessage(msg);
         });

         // receives message sent to all dataHistories
         rs.recv("To_All_Data_Histories", function (uid, msg) {
            $scope.dHistory.recvMessage(msg);
         });

         rs.recv("end_game", function (uid, msg) {
            rs.finish();
         });

         $scope.processInputAction = function (inputIndex) {
            console.log($scope.inputData[inputIndex]);
            switch ($scope.inputData[inputIndex][1]) {
               case "OUT":
                  var msg = new Message("USER", "UOUT", [rs.user_id, $scope.tradingGraph.getCurOffsetTime()]);
                  $scope.sendToGroupManager(msg);
                  $scope.setState("state_out");
                  break;

               case "SNIPE":
                  var msg = new Message("USER", "USNIPE", [rs.user_id, $scope.tradingGraph.getCurOffsetTime()]);
                  $scope.sendToGroupManager(msg);
                  $scope.setState("state_snipe");
                  break;

               case "MAKER":
                  var msg = new Message("USER", "UMAKER", [rs.user_id, $scope.tradingGraph.getCurOffsetTime()]);
                  $scope.sendToGroupManager(msg);
                  $scope.setState("state_maker");
                  break;

               case "FAST":
                  $scope.setSpeed(true);
                  $("#speed-on").attr("checked", true);
                  break;

               case "SLOW":
                  $scope.setSpeed(false);
                  $("#speed-off").attr("checked", true);
                  break;

               case "SPREAD":
                  var newVal = parseFloat($scope.inputData[inputIndex][2]);
                  if (newVal != $scope.sliderVal) {
                     $scope.sliderVal = newVal;
                     $("#slider").slider({value: newVal});
                     var msg = new Message("USER", "UUSPR", [rs.user_id, $scope.sliderVal, $scope.tradingGraph.getCurOffsetTime()]);
                     $scope.sendToGroupManager(msg);
                  }
                  if ($scope.state != "state_maker") {
                     var msg2 = new Message("USER", "UMAKER", [rs.user_id, $scope.tradingGraph.getCurOffsetTime()]);
                     $scope.sendToGroupManager(msg2);
                     $scope.setState("state_maker");
                  }
                  break;

               default:
                  console.error("invalid input: " + $scope.inputData[inputIndex][1]);
            }

            if (inputIndex >= $scope.inputData.length - 1) return;
            //delay
            var delay = parseInt($scope.inputData[inputIndex + 1][0]) + ($scope.dHistory.startTime - $scope.tradingGraph.getCurOffsetTime())/1000000;
            console.log("delay: " + delay);
            window.setTimeout($scope.processInputAction, delay, inputIndex + 1);
         }
      }]);
