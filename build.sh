#!/bin/sh
# Rebuild lg5.bundle.js after editing any .jsx file:  sh build.sh
cat lg-ui.jsx lg-pages.jsx lg3-admin.jsx lg3-editor.jsx lg5-home.jsx lg5-app.jsx > /tmp/lg5-all.jsx
npx --yes esbuild@0.24.2 /tmp/lg5-all.jsx --loader:.jsx=jsx --jsx=transform --minify --target=es2018 --outfile=lg5.bundle.js
