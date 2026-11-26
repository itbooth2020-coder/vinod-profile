// CloudFront Function (cloudfront-js-2.0, viewer-request) on the default behavior:
// 301 from vinodyadav.com to https://www.vinodyadav.com, keeping the path and query string.
function handler(event) {
  var request = event.request;
  var host = request.headers.host ? request.headers.host.value : '';

  if (host === 'vinodyadav.com') {
    var qs = [];
    var params = request.querystring;
    for (var key in params) {
      var p = params[key];
      if (p.multiValue) {
        for (var i = 0; i < p.multiValue.length; i++) {
          qs.push(p.multiValue[i].value === '' ? key : key + '=' + p.multiValue[i].value);
        }
      } else {
        qs.push(p.value === '' ? key : key + '=' + p.value);
      }
    }
    var location = 'https://www.vinodyadav.com' + request.uri + (qs.length ? '?' + qs.join('&') : '');
    return {
      statusCode: 301,
      statusDescription: 'Moved Permanently',
      headers: { location: { value: location } }
    };
  }
  return request;
}
