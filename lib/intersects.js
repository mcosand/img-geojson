
function intersects(left, right) {
  //var a = left.west < right.east;
  //var b = left.east > right.west;
  //var c = left.north > right.south;
  //var d = left.south < right.north;

  var a = left.west < right.east;
  var b = left.east > right.west;
  var c = left.north > right.south;
  var d = left.south < right.north;


  if (false) {
    console.log(JSON.stringify(left) + ' intersects ' + JSON.stringify(right) + "??");

    console.log(a);
    console.log(b);
    console.log(c);
    console.log(d);
  }
  return (a && b && c && d);
}

module.exports = intersects;