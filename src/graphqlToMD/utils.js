var bar = require(__dirname + '/../../progressBar/bar');

function printer(lines, s) {
  lines.push(s);
}

function sortBy(arr, property) {
  arr.sort((a, b) => {
    const aValue = a[property];
    const bValue = b[property];
    if (aValue > bValue) return 1;
    if (bValue > aValue) return -1;
    return 0;
  });
}

function log(d=[],t = "NONE") {
  console.log('\n******************************************\n');
  console.log(t.toUpperCase());
  console.log('\n\n');
  console.log(JSON.stringify(d));
  console.log('\n******************************************');
}

function copy(i) {
  return JSON.parse(JSON.stringify(i));
}

function formatDate(d) {
  const date = new Date(d);
  const day = ('' + date.getDate()).padStart(2, '0');
  const month = ('' + (date.getMonth() + 1)).padStart(2, '0');
  const year = date.getFullYear();
  return `${year}-${month}-${day}`;
}

function escapeHtml(unsafe) {
  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
    .replace(/\n/g, ' \\n ');
}

function completeBar() {
  if (!bar.complete) {
    setTimeout(_ => {
      bar.tick();
      completeBar();
    }, 500);
  } else {
    bar.interrupt('[Done]');
  }
};

module.exports = {
  printer,
  sortBy,
  formatDate,
  escapeHtml,
  log,
  copy,
  completeBar
};
