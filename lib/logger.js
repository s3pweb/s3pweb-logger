"use strict";

class Logger {

  constructor() {

    if(!Logger.instance)
    {
        this.infoCnt = 0;
        this.warmCnt = 0;
        Logger.instance = this
    }    

    return Logger.instance
  }

  info(msg) {
    console.log(`INFO: ${msg}`);
    this.infoCnt++;
  }

  warm(msg) {
    console.log(`WARM: ${msg}`);
    this.warmCnt++;
  }

  metrics() {
   return {
       info: this.infoCnt,
       warm: this.warmCnt
   }
  }
}

const instance = new Logger();

//Object.freeze(instance)

module.exports = instance;
