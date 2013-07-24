var openedEyesRootPath = document.getElementById('openedeyes').src.replace('openedeyes.js','');
document.write('<script type="text/javascript" src="' + openedEyesRootPath + 'prototype.js"><\/script>\n');
document.write('<script type="text/javascript" src="' + openedEyesRootPath + 'main.js"><\/script>\n');
var openedEyesVisualizers = ['bubble','parallel_coordinates','map','graph','pie_graph'];
for (var i = 0; i < openedEyesVisualizers.length; i++) {
  var name = openedEyesVisualizers[i];
  document.write('<script type="text/javascript" id="openedeyes_' + name + '" src="' + openedEyesRootPath + '../../' + name + '/js/' + name + '.js"><\/script>\n');
}
