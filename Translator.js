// These functions are used to convert messages between the in-house leeps message format and
// OUCH 4.2 format or ITCH 4.1 format

// see "utility.js" for reference on the in-house leeps format

// see https://nasdaqtrader.com/content/technicalsupport/specifications/TradingProducts/OUCH4.2.pdf
// for referance on the OUTCH 4.2 format

// see http://www.nasdaqtrader.com/content/technicalsupport/specifications/dataproducts/nqtv-itch-v4_1.pdf
// for referance on the OUTCH 4.1 format



// converts from the in-house leeps message format to an OUCH 4.2 formatted message
function leepsMsgToOuch(leepsMsg){
   
   // Convert an enter order message
   if(leepsMsg.msgType === "EBUY" || leepsMsg.msgType === "ESELL"){
      var ouchMsg = new Uint8Array(49);
      
      // Type
      ouchMsg[0] = charToByte('O');

      // Order Token
      ouchMsg[1] = charToByte('S');
      ouchMsg[2] = charToByte('U');      
      ouchMsg[3] = charToByte('B');
      ouchMsg[4] = charToByte(String.fromCharCode(64 + leepsMsg.msgData[0]));
      spliceInArray(decimalToByteArray(leepsMsg.msgId, 10), ouchMsg, 10, 5);

      // Buy/Sell indicator
      if(leepsMsg.msgType === "EBUY"){
         ouchMsg[15] = charToByte('B');
      }
      else if(leepsMsg.msgType === "ESELL"){
         ouchMsg[15] = charToByte('S');
      }
      
      // Shares
      spliceInArray(intToByteArray(1), ouchMsg, 4, 16);

      // Stock Symbol - these two numbers together make "LPS     " when cast from bytes to characters
      spliceInArray(intToByteArray(1280332576), ouchMsg, 4, 20);
      spliceInArray(intToByteArray(538976288), ouchMsg, 4, 24);

      // Price
      spliceInArray(priceToByteArray(leepsMsg.msgData[1]), ouchMsg, 4, 28);

      // Time in Force
      if(leepsMsg.msgData[2] === true){
         spliceInArray(intToByteArray(0), ouchMsg, 4, 32);
      }
      else{
         spliceInArray(intToByteArray(99999), ouchMsg, 4, 32);
      }

      // Firm
      //spliceInArray(intToByteArray(leepsMsg.senderId), ouchMsg, 4, 36);
      ouchMsg[36] = charToByte('S');
      ouchMsg[37] = charToByte('U');      
      ouchMsg[38] = charToByte('B');
      ouchMsg[39] = charToByte(String.fromCharCode(64 + leepsMsg.msgData[0]));

      // Display
      ouchMsg[40] = charToByte('Y');

      // Capacity
      ouchMsg[41] = charToByte('P');

      // Intermarket Sweep Eligibility
      ouchMsg[42] = charToByte('N');

      // Minimum quantity
      spliceInArray(intToByteArray(0), ouchMsg, 4, 43);

      // Cross Type
      ouchMsg[47] = charToByte('N');

      // Customer Type
      ouchMsg[48] = charToByte('R');

      return ouchMsg;
   }
   else if(leepsMsg.msgType === "RBUY" || leepsMsg.msgType === "RSELL")
   {
      var ouchMsg = new Uint8Array(19);
      
      // Type
      ouchMsg[0] = charToByte('X');

      // Order Token
      ouchMsg[1] = charToByte('S');
      ouchMsg[2] = charToByte('B');
      spliceInArray(decimalToByteArray(leepsMsg.senderId, 2), ouchMsg, 2, 3);
      spliceInArray(decimalToByteArray(leepsMsg.msgId, 10), ouchMsg, 10, 5);

      // Shares
      spliceInArray(intToByteArray(0), ouchMsg, 4, 15);

      return ouchMsg;
   }
   else if(leepsMsg.msgType === "UBUY" || leepsMsg.msgType === "USELL")
   {
      var ouchMsg = new Uint8Array(47);

      // Type
      ouchMsg[0] = charToByte('U');

      // Existing Order Token
      // TODO

      // Replacement Order Token
      // TODO

      // Shares
      spliceInArray(intToByteArray(1), ouchMsg, 4, 29);

      // Price
      spliceInArray(priceToByteArray(leepsMsg.msgData[1]), ouchMsg, 4, 33);

      // Time in Force
      if(leepsMsg.msgData[2] === true){
         spliceInArray(intToByteArray(0), ouchMsg, 4, 37);
      }
      else{
         spliceInArray(intToByteArray(99999), ouchMsg, 4, 37);
      }

      // Display
      ouchMsg[41] = charToByte('Y');

      // Intermarket Sweep Eligibility
      ouchMsg[42] = charToByte('N');

      // Minimum quantity
      spliceInArray(intToByteArray(1), ouchMsg, 4, 43);

      return ouchMsg;
   }
}





// converts from the OUCH 4.2 formatted message to the in-house leeps message format
function ouchToLeepsMsg(ouchMsg){

}



// converts from the in-house leeps message format to an ITCH 4.1 formatted message
function leepsMsgToItch(leepsMsg){

}


// converts from the ITCH 4.1 formatted message to the in-house leeps message format
function itchToLeepsMsg(itchMsg){

}



// converts an int to an array of four bytes
function intToByteArray(num){
   var bytes = new Uint8Array(4);
   
   bytes[3] = num & (255);
   num = num >> 8
   bytes[2] = num & (255);
   num = num >> 8
   bytes[1] = num & (255);
   num = num >> 8
   bytes[0] = num & (255);

   return bytes;
}



// converts a float price into the standard byte format for OUCH and ITCH.
// $179.26 becomes 17926 and then is converted to a byte array
function priceToByteArray(price){
   price = Math.trunc(price * 100);
   return intToByteArray(price);
}  



// splices in elements from one array (giveArray) into another array (recvArray) at a set offset
function spliceInArray(giveArray, recvArray, length, offset){
   for(var i = 0; i < length; i++){
      recvArray[i+offset] = giveArray[i];
   }
}



// converts a character to its ascii number so that it can be stored as a byte
function charToByte(character){
   return character.charCodeAt();
}



// prints a byte array for debugging. Each byte is printed in hex
function printByteArray(byteArray, length){
   for(var i = 0; i < length; i++){
      
      // as hex number:
      console.log("byte " + i + ": " + byteArray[i].toString(16) + "\t\tchar:" + String.fromCharCode(byteArray[i]));   
   }
}

function decimalToByteArray(num, numDigits){
   var bytes = new Uint8Array(numDigits);
   for(var i = numDigits-1; i >= 0; i--){
      var tmp = num % 10;
      bytes[i] = tmp + 48;
      num = Math.floor(num/10);
   }
   return bytes;
}




// For testing output
function download(inString, strFileName, strMimeType) {

    var strData = "";
    for(var i = 0; i < inString.length; i++){
      var temp = inString.charAt(i);
      var hexTemp = temp.charCodeAt().toString(16);
      if(hexTemp.length === 1){
        strData += '0';
      }
      strData += hexTemp;
    }

    var D = document,
        A = arguments,
        a = D.createElement("a"),
        d = A[0],
        n = A[1],
        t = A[2] || "text/plain";

    //build download link:
    a.href = "data:" + strMimeType + "charset=utf-8," + escape(strData);


    if (window.MSBlobBuilder) { // IE10
        var bb = new MSBlobBuilder();
        bb.append(strData);
        return navigator.msSaveBlob(bb, strFileName);
    } /* end if(window.MSBlobBuilder) */



    if ('download' in a) { //FF20, CH19
        a.setAttribute("download", n);
        a.innerHTML = "downloading...";
        D.body.appendChild(a);
        setTimeout(function() {
            var e = D.createEvent("MouseEvents");
            e.initMouseEvent("click", true, false, window, 0, 0, 0, 0, 0, false, false, false, false, 0, null);
            a.dispatchEvent(e);
            D.body.removeChild(a);
        }, 66);
        return true;
    }; /* end if('download' in a) */



    //do iframe dataURL download: (older W3)
    var f = D.createElement("iframe");
    D.body.appendChild(f);
    f.src = "data:" + (A[2] ? A[2] : "application/octet-stream") + (window.btoa ? ";base64" : "") + "," + (window.btoa ? window.btoa : escape)(strData);
    setTimeout(function() {
        D.body.removeChild(f);
    }, 333);
    return true;
}


// 
function outputMsgs(msgArray){
   var outStr = "";
   for(msg of msgArray){
      console.log(msg);
      for(byte of msg){
         outStr += String.fromCharCode(byte);
      }
   }
   download(outStr, "test.txt", "text/plain");
}