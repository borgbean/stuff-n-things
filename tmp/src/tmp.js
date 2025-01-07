function setVal(val) {
    document.querySelector('#textAreaInputData').value = val;
}

function getVal() {
    return document.querySelector('#textAreaInputData').value;
}

function * getResults() {
    for(let result of document.querySelectorAll('#result')) {
        yield parseInt(result.textContent, 16);
    }
}

function run() {
    document.querySelector('#btnCrcCustom').click();
}


// "Class" for calculating CRC8 checksums...
function CRC8(polynomial, initial_value) { // constructor takes an optional polynomial type from CRC8.POLY
    if (polynomial == null) polynomial = CRC8.POLY.CRC8_CCITT
    this.table = CRC8.generateTable(polynomial);
    this.initial_value = initial_value;
  }
  
  // Returns the 8-bit checksum given an array of byte-sized numbers
  CRC8.prototype.checksum = function(byte_array) {
    var c = this.initial_value;
  
    for (var i = 0; i < byte_array.length; i++ ) 
      c = this.table[(c ^ byte_array[i]) % 256] 
  
    return c;
  } 
  
  // returns a lookup table byte array given one of the values from CRC8.POLY 
  CRC8.generateTable =function(polynomial)
  {
    var csTable = [] // 256 max len byte array
    
    for ( var i = 0; i < 256; ++i ) {
      var curr = i
      for ( var j = 0; j < 8; ++j ) {
        if ((curr & 0x80) !== 0) {
          curr = ((curr << 1) ^ polynomial) % 256
        } else {
          curr = (curr << 1) % 256
        }
      }
      csTable[i] = curr 
    }
      
    return csTable
  }
  
  // This "enum" can be used to indicate what kind of CRC8 checksum you will be calculating
  CRC8.POLY = {
    CRC8 : 0xd5,
    CRC8_CCITT : 0x07,
    CRC8_DALLAS_MAXIM : 0x31,
    CRC8_SAE_J1850 : 0x1D,
    CRC_8_WCDMA : 0x9b,
  }



let inputs = [];
let inclines = ['02530206000103','025302060a3f03','02530206143503','025302061e2303','0253020628d903','0253020632d703','025302063ccd03','0253020646fb03','0253020650f103','025302065aef03']
let speeds = ['02530206000103','02530207000603','02530208000703','02530209000403','0253020a000503','0253020b003a03','0253020c003b03','0253020d003803','0253020e003903','0253020f003e03','02530210003f03','02530211003c03','02530212003d03','02530213003203','02530214003303','02530215003003','02530216003103','02530217003603','02530218003703','02530219003403','0253021a003503','0253021b002a03','0253021c002b03','0253021d002803','0253021e002903','0253021f002e03','02530220002f03','02530221002c03','02530222002d03','02530223002203','02530224002303','02530225002003','02530226002103','02530227002603','02530228002703']

let seens = new Array(256).fill(0);
let seens2 = new Array(256).fill(0);
let seens3 = new Array(256*256).fill(0);
// debugger;
for(let incline of inclines) {
    let bin = BigInt(`0x${incline}`).toString(2);
    let part5 = parseInt(bin.substring(0, 2), 2);
    let part4 = parseInt(bin.substring(2, 2 + 8), 2);
    let part3 = parseInt(bin.substring(2 + 8, 2 + 8 + 8), 2);
    let part1 = parseInt(bin.substring(2 + 8 + 8, 2 + 8 + 8 + 8), 2);
    let part2 = parseInt(bin.substring(2 + 8 + 8 + 8, 2 + 8 + 8 + 8 + 8), 2);
    let result = parseInt(bin.substring(2 + 8 + 8 + 8 + 8, 2 + 8 + 8 + 8 + 8 + 8), 2);
    // console.log(part1 + ':' + part2 + ':' + result)
    // console.log(part2)
    // console.log((part1^part2)^result);

    let cksum = part1 + part2 + part3 + part4;
    cksum %= 256;
    cksum ^= 90;

    
    console.log(`got: ${cksum}, expected: ${result}`);

    // let e = t.split(',');
    // let i = parseInt(e[1], 16);
    // for (var a = 0; a < e.length; a++) {
    //     if(a > 1 && a < e.length - 2) {
    //         (i += parseInt(e[a], 16));
    //     }
    // }
    // (i %= 256);
    // (i ^= 90);
    // (i = i.toString(16));
    // (e[e.length - 2] = i);
    // for (var s = "", r = 0; r < e.length; r++) e[r].length < 2 && (e[r] = "0" + e[r]), (s += e[r]), "ios" == n.default.platform && r < e.length - 1 && (s += ",");
    // return s;

    // let arr = [part1, part2];//k with part1 ^ part2??

    // for(let i = 0; i < 256; ++i) {
    //     for(let j = 0; j < 256; ++j) {
    //         let crc = new CRC8(i, j);
    //         let matches = result === crc.checksum(arr);
    //         if(matches) {
    //             seens3[i*256 + j] += 1;
    //         }
    //     }
    // }
    // break;


    // for(let i = 0; i < 256; ++i) {
    //     let xOr = (part1 ^ part2) ^ i;
    //     setVal(xOr);
    //     run()
    //     // for(let j = 0; j < 256; ++j) {
    //         for(let r of getResults()) {
    //             // if(isNaN(result))debugger;
    //             if((r^i) === result) {
    //                 seens[i] += 1;
    //                 // seens2[j] += 1;
    //                 console.log('k');
    //             }
    //         }
    //     // }
    // }
    // break;
}

console.log(seens3.filter(x => x>1))

// console.table(seens);




