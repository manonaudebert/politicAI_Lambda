## Lambda ##
This is the lambda code which will summarize the article and attempt to provide an output of the form topic:politician name.


## Upload a new version to Lambda
Run the following commands to delete the old zipped version & re-zip
```
rm lambdaFunc.zip
zip -r lambdaFunc.zip .
```

Upload zipped file. 