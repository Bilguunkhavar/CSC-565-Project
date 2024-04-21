# CSC-565 Term Project

This project's aim is to build a compiler that converts HLC (custom made High Level Code) file into YMC (assembly file) and BYMC (binary file). It also outputs a csv file which would be easier to track which line of HLC turned into which line in the binary file and assembly file.

## To start

- Install NodeJS - https://nodejs.org/en/download
- `node app.js filename.hlc`

Which will out put the csv, assembly, and the binary files.

## Example

```
node app.js test1.hlc
```

The output will be: `test1.ymc`, `test1.csv`, and `test1.bymc`.

## Testing

```
node test
```
