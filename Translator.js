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
      ouchMsg[0] = charToByte('O');

      
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

   console.log("Original num: " + num);
   printByteArray(bytes, 4);

   return bytes;
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
      console.log("byte " + i + ": " + byteArray[i].toString(16));
   }
}