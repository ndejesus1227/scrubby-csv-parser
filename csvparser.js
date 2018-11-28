const fs = require('fs');
const parse = require('csv-parse');
const path = require('path');

const readline = require('readline');
const rl = readline.createInterface({
	input: process.stdin,
	output: process.stdout
});

const CSV_DIR = path.join(__dirname, 'csvdata');
const JSON_DIR = path.join(__dirname, 'json');


const GIF_PATH = path.join(__dirname, 'T7C Move List with GIF URLs (CSV File).csv');
const MAPPING = require('./defaultmapping.json');


const parseChar = function(names, movelistFN) {
	const moveListPath = path.join(CSV_DIR, movelistFN);

	fs.readFile(moveListPath, (err, moveListCSVRaw) => {
		if(err) {
			console.log(err);
			return;
		}

		fs.readFile(GIF_PATH, (err, gifsCSVRaw) => {
			if(err) {
				console.log(err);
				return;
			}

			parse(gifsCSVRaw, {columns: true}, (err, gifsCSV) => {

				//Reformat the gifs to store url by notation key
				let gifsObj = gifsCSV.reduce((acc, rowObj, index) => {
					if(rowObj['Character'] == names.displayName) {
						acc[rowObj['Move Input']] = rowObj['GIF URL'];
					}

					return acc;

				}, {});

				parse(moveListCSVRaw, {}, (err, moveListArray) => {
					const moveListObj = moveListToJson(moveListArray, gifsObj, names.label);

					const charObj = {
						displayName: names.displayName,
						fullname: names.fullname,
						label: names.label,
						movelist: moveListObj
					};

					fs.writeFile(path.join(JSON_DIR, names.label + '.json'), JSON.stringify(charObj, null, '\t'), 'utf8', (err) => { 
						if(err) console.log('Writing failed. I hate my life: ', err);
						else console.log("Yo you did it, good job");
					});
				});
				
			})

		});

	});

};

const moveListToJson = function(moveListCSVArray, gifsObj, label) {
	let mappedCols = [];
	let dividerCount = 0;

	//console.log(gifsObj);
	return moveListCSVArray.reduce((acc, rowArray, index) => {
		if(index == 0) {
			const colsToMap = Object.keys(MAPPING);
			
			for(let i = 0; i < rowArray.length; i++) {
				if(colsToMap.includes(rowArray[i])) {
					mappedCols[i] = rowArray[i];
				}
			}

			return acc;
		}

		let sectionDivider = true;


		let rowObj = {
			properties: [],
			preview_url: null
		};

		for(let i = 0; i < rowArray.length; i++) {
			//Checker for empty section divider rows
			if(sectionDivider && i > 0 && rowArray[i])
				sectionDivider = false;

			//Only storing data listed in the mapping file
			if(mappedCols[i]) {
				const col = MAPPING[mappedCols[i]]
				rowObj[col] = rowArray[i];

				//GIF data stored by notation so also searching here
				if(col == "notation") {
					const gifUrl = gifsObj[rowArray[i]];

					if(gifUrl)
						rowObj['preview_url'] = gifsObj[rowArray[i]];
				}
			}

		}

		rowObj['id'] = label + (index - dividerCount);
		
		if(!sectionDivider) {
			acc.push(rowObj);
		} else {
			dividerCount++;
		}
		
		return acc;
	}, []);


};



rl.question('Character Display Name: ', (displayName) => {
	rl.question('Character Full Name: ', (fullname) => {
		rl.question('Character Label: ', (label) => {
			rl.question('Move file name: ', (movelistFileName) => {
				parseChar({
					displayName: displayName,
					fullname: fullname,
					label: label
				}, movelistFileName);
			});
		});
	});
})