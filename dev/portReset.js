const fs = require('fs'),
      replace = require('replace-in-file');

let port = fs.readFileSync('../port.txt', { encoding: 'utf-8' });

let changes = replace.sync({
    files: '../public/index.js',
    from: `const port = ${port}`,
    to: `const port = 3000`
});
console.log(changes);

fs.writeFileSync('../port.txt', '3000', { encoding: 'utf-8', flag: 'w' });