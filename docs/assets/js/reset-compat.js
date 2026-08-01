const target = new URL("./reset-password.html", location.href);
target.search = location.search;
target.hash = location.hash;
location.replace(target.href);
