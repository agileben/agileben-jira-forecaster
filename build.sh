rm agileben-jira-forecaster.zip
rm -r dist
mkdir -p dist
cp * dist
rm dist/*.zip
rm dist/*.pem
rm dist/*.crx
cp -r lib dist
cp -r css dist
cd dist
zip -r ../agileben-jira-forecaster.zip * 
