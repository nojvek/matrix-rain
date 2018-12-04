#!/usr/bin/env node

const fs = require(`fs`);
const ArgumentParser = require(`argparse`).ArgumentParser;
const ansi = require(`./ansi`);
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
    flags: [ `-c`, `--color` ],
    opts: {
      choices: [`green`, `red`, `blue`, `yellow`, `magenta`, `cyan`, `white`],
      defaultValue: `green`,
      dest: `color`,
      help: `Rain color. NOTE: droplet start is always white`,
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


// Simple string stream buffer + stdout flush at once
let outBuffer = [];
function write(chars) {
  return outBuffer.push(chars);
}

function flush() {
  stdout.write(outBuffer.join(``));
  return outBuffer = [];
}

function rand(start, end) {
  return start + Math.floor(Math.random() * (end - start));
}


class MatrixRain {
  constructor(opts) {
    this.opts = opts;
    this.maxSpeed = 20;
    this.colDroplets = [];
    this.numCols = 0;
    this.numRows = 0;
  }

  generateChars(len, charRange) {
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

    // emojis are two character widths, so use a prefix
    let preChar = charRange === `emoji` ? emojiChar : ``;
    let chars = new Array(len);
    for (let i = 0; i < len; ++i) {
      chars[i] = preChar + String.fromCharCode(rand(startCharCode, endCharCode));
    }

    return chars;
  }

  makeDroplet(col) {
    return {
      col,
      alive: 0,
      curRow: rand(0, this.numRows),
      height: rand(this.numRows / 2, this.numRows),
      speed: rand(1, this.maxSpeed),
      chars: this.generateChars(this.numRows, this.opts.charRange),
    };
  }

  resizeDroplets() {
    // stdout returns values off by one
    this.numCols = stdout.columns;
    this.numRows = stdout.rows + 1 ;

    // transpose for direction
    if (this.opts.direction === `h`) {
      [this.numCols, this.numRows] = [this.numRows, this.numCols];
    }

    // Create droplets per column
    // add/remove droplets to match column size
    if (this.numCols > this.colDroplets.length) {
      for (let col = this.colDroplets.length; col < this.numCols; ++col) {
        // make two droplets per row that start in random positions
        this.colDroplets.push([this.makeDroplet(col), this.makeDroplet(col)]);
      }
    } else {
      this.colDroplets.splice(this.numCols, this.colDroplets.length - this.numCols);
    }
  }

  writeAt(row, col, str, color) {
    if (this.opts.direction === `h`) {
      [row, col] = [col, row];
    }
    // Only output if in viewport
    if (row >=0 && row < this.numRows && col >=0 && col < this.numCols) {
      write(`${ansi.cursorPos(row, col)}${color || ``}${str || ``}`);
    }
  }

  renderFrame() {
    const color = this.opts.color;
    const ansiColor = ansi.colors[`fg${color.charAt(0).toUpperCase()}${color.substr(1)}`]();

    for (const droplets of this.colDroplets) {
      for (const droplet of droplets) {
        const {curRow, col: curCol, height} = droplet;
        droplet.alive++;

        if (droplet.alive % droplet.speed === 0) {
          this.writeAt(curRow, curCol, droplet.chars[curRow], ansi.colors.fgWhite());
          this.writeAt(curRow - 1, curCol, droplet.chars[curRow - 1], ansiColor);
          this.writeAt(curRow - height, curCol, ` `);
          droplet.curRow++;
        }

        if (curRow - height > this.numRows) {
          // reset droplet
          Object.assign(droplet, this.makeDroplet(droplet.col), {curRow: 0});
        }
      }
    }

    flush();
  }
}


//// main ////

const args = argParser.parseArgs();
const matrixRain = new MatrixRain(args);

stdout.on(`resize`, function() {
  matrixRain.resizeDroplets();
});

process.on(`SIGINT`, function() {
  write(ansi.cursorVisible());
  write(ansi.cursorHome());
  write(ansi.useNormalBuffer());
  flush();
  process.exit();
});

// clear terminal and use alt buffer
write(ansi.useAltBuffer());
write(ansi.cursorInvisible());
write(ansi.colors.bgBlack());
write(ansi.clearScreen());
flush();
matrixRain.resizeDroplets();

setInterval(() => matrixRain.renderFrame(), 16); // 60FPS
