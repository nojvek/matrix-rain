const fs = require(`fs`);
const ArgumentParser = require(`argparse`).ArgumentParser;
const stdout = process.stdout;

const argParser = new ArgumentParser({
  version: `2.0.0`,
  description: `The famous Matrix rain effect of falling green characters as a cli command`,
});

[
  {
    flags: [ `-d`, `--direction` ],
    opts: {
      choices: [`h`, `v`],
      defaultValue: `v`,
      help: `Change direction of rain. h=horizontal, v=vertical`,
    },
  },
  {
    flags: [ `-k`, `--char-range` ],
    opts: {
      choices: [`ascii`, `binary`, `braille`, `emoji`, `kanji`],
      defaultValue: `ascii`,
      dest: `charRange`,
      help: `Use rain characters from char-range`,
    },
  },
  {
    flags: [ `-f`, `--file-path` ],
    opts: {
      dest: `filePath`,
      help: `Read characters from a file instead of random characters from char-range`,
    },
  },
].forEach(({flags, opts}) => argParser.addArgument(flags, opts));

const args = argParser.parseArgs();

const ctlEsc = `\x1b[`;
const ansi = {
  reset: () => `${ctlEsc}c`,
  clearScreen: () => `${ctlEsc}2J`,
  cursorHome: () => `${ctlEsc}H`,
  cursorPos: (row, col) => `${ctlEsc}${row};${col}H`,
  cursorVisible: () => `${ctlEsc}?25h`,
  cursorInvisible: () => `${ctlEsc}?25l`,
  useAltBuffer: () => `${ctlEsc}?47h`,
  useNormalBuffer: () => `${ctlEsc}?47l`,
  underline: () => `${ctlEsc}4m`,
  off: () => `${ctlEsc}0m`,
  bold: () => `${ctlEsc}1m`,
  color: c => `${ctlEsc}${c};1m`,

  colors: {
    fgRgb: (r, g, b) => `${ctlEsc}38;2;${r};${g};${b}m`,
    bgRgb: (r, g, b) => `${ctlEsc}48;2;${r};${g};${b}m`,
    fgBlack: () => ansi.color(`30`),
    fgRed: () => ansi.color(`31`),
    fgGreen: () => ansi.color(`32`),
    fgYellow: () => ansi.color(`33`),
    fgBlue: () => ansi.color(`34`),
    fgMagenta: () => ansi.color(`35`),
    fgCyan: () => ansi.color(`36`),
    fgWhite: () => ansi.color(`37`),
    bgBlack: () => ansi.color(`40`),
    bgRed: () => ansi.color(`41`),
    bgGreen: () => ansi.color(`42`),
    bgYellow: () => ansi.color(`43`),
    bgBlue: () => ansi.color(`44`),
    bgMagenta: () => ansi.color(`45`),
    bgCyan: () => ansi.color(`46`),
    bgWhite: () => ansi.color(`47`),
  },
};

let outBuffer = ``;
function write(chars) {
  return outBuffer += chars;
}

function flush() {
  stdout.write(outBuffer);
  return outBuffer = ``;
}

function rand(start, end) {
  return start + Math.floor(Math.random() * (end - start));
}

function generateChars(len, charRange) {
  // by default charRange == ascii
  let startCharCode = 0x21;
  let endCharCode = 0x7E;
  let emojiChar = String.fromCharCode(0xd83d);
  if (charRange === `braille`) {
    startCharCode = 0x2840;
    endCharCode = 0x28ff;
  } else if (charRange === `emoji`) {
    startCharCode = 0xde01;
    endCharCode = 0xde4a;
  } else if (charRange === `kanji`) {
    startCharCode = 0x30a0;
    endCharCode = 0x30ff;
  }

  let chars = new Array(len);
  let preChar = charRange === `emoji` ? emojiChar : ``;
  for (let i = 0; i < len; ++i) {
    chars[i] = preChar + String.fromCharCode(rand(startCharCode, endCharCode));
  }

  return chars;
}

const droplets = [];
const maxSpeed = 20;
let numCols = 0;
let numRows = 0;

function makeDroplet(col) {
  return {
    col,
    alive: 0,
    curRow: 0,
    height: rand(numRows / 2, numRows),
    speed: rand(1, maxSpeed),
    chars: generateChars(numRows, args.charRange),
  };
}

function resizeDroplets() {
  // stdout returns values off by one
  numCols = stdout.columns;
  numRows = stdout.rows + 1 ;

  // Create droplets per column
  // add/remove droplets to match column size
  if (numCols > droplets.length) {
    for (let col = droplets.length; col < numCols; ++col) {
      droplets.push(makeDroplet(col));
    }
  } else {
    droplets.splice(numCols, droplets.length - numCols);
  }
}

function renderFrame() {
  for (const droplet of droplets) {
    const {curRow, col: curCol, height} = droplet;
    if (curRow < numRows) {
      if (droplet.alive % droplet.speed === 0) {
        write(ansi.cursorPos(curRow, curCol));
        write(ansi.colors.fgWhite());
        write(droplet.chars[curRow]);
        if (curRow -1 >= 0) {
          // turn previous line green
          write(ansi.cursorPos(curRow - 1, curCol));
          write(ansi.colors.fgGreen());
          write(droplet.chars[curRow - 1]);
        }

        if (curRow - height >= 0) {
          write(ansi.cursorPos(curRow - height, curCol));
          write(` `);
        }
        droplet.curRow++;
      }
      droplet.alive++;
    } else {
      // make last line green
      write(ansi.cursorPos(curRow - 1, curCol));
      write(ansi.colors.fgGreen());
      write(droplet.chars[curRow - 1]);

      // reset droplet
      Object.assign(droplet, makeDroplet(droplet.col));
    }
  }
  flush();
}

//// main ////

stdout.on(`resize`, function() {
  return resizeDroplets();
});

process.on(`SIGINT`, function() {
  write(ansi.cursorVisible());
  write(ansi.cursorHome());
  write(ansi.useNormalBuffer());
  flush();
  return process.exit();
});

write(ansi.useAltBuffer());
write(ansi.cursorInvisible());
write(ansi.clearScreen());
flush();
resizeDroplets();

setInterval(renderFrame, 16); // 60FPS
