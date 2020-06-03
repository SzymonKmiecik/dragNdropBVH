
//------------------------------------File loading logic--------------------
const selector = document.getElementById('selector');
selector.addEventListener('change', (event) => {
    const file = event.target.file;
    console.log(file);
});

const dropArea = document.getElementById('drag-drop');
dropArea.addEventListener('dragover', (event) => {
    event.stopPropagation();
    event.preventDefault();
    event.dataTransfer.dropEffect = 'copy';
});

dropArea.addEventListener('drop', (event) => {
    event.stopPropagation();
    event.preventDefault();
    let files = event.dataTransfer.files;
    for (let i = 0; i < files.length; i++) {
        console.log(files[i].name);

        let dataExtract = readFile(files[i], function (val) {
            alert(val);
        });
        area = document.getElementById('drag-drop').innerHTML += '<hr style="width:70%"';
    }

});

function readFile(file, callback) {
    let val = " ";
    const reader = new FileReader();
    let partData;
    reader.onload = function (e) {
        val = e.target.result;
        skeleton = parseSkeleton(val);
        //return val;
        //return splitFile(e.target.result);
        //}

        //var readed = reader.result;
        //var splitFile = splitData(readed)
        //return splitFile;
        //return partData;
    }
    reader.readAsText(file);
    /*    reader.addEventListener('load', (event) => {
            const result = event.target.result;
            //console.log(result);
            partData = splitData(result);
            let area = document.getElementById('drag-drop');
            //area.style.color = "white";
            area.style.backgroundColor = 'white';
            area.innerHTML += partData[3];
        }); */

    reader.addEventListener('progress', (event) => {
        if (event.loaded && event.total) {
            const percent = (event.loaded / event.total) * 100;
            console.log(Math.round(percent));
        }
    });
}


function splitData(data) {
    let str = data.split('\r\n');
    for (let i = 0; i < str.length - 1; i++) {
        str[i].trim().replace(/\t+/g, ' ');
        str[i].trim();
    }
    return str;
}

//------------------------------------------Hierarchy-----------------------
function parseSkeleton(datas) {
    let data = splitData(datas);
    data = data.map(function (s) { return String.prototype.trim.apply(s); });
    tmpSkeleton = new Skeleton();
    let parent = '';
    let bracketControll = { depth: 0 } // used for determining depth in the skeleton hierarhy
    //    if (bracketControll.depth == 0)
    //        parent = '';

    for (let i = 0; i < data.length; i++) {
        console.log(i);

        if (data[i].includes('MOTION') == true) {
            frames.count = parseInt(data[i + 1].split('\t')[1]);
            parseMotion(data.slice(i + 3)); //start of a motion values
            break;
        }

        if (data[i].includes('ROOT') == true || data[i].includes('JOINT') == true) {
            parent = findParent(skeleton, bracketControll.depth);
            //rage from i to i+4 is whole data needed to parse node.
            skeleton.addNode(parseNextNode(data.slice(i, i + 4), parent, bracketControll.depth));
            bracketControll.depth++;
        }

        if (data[i].includes('End Site') == true) {
            parent = findParent(skeleton, bracketControll.depth);
            //end site have only offset and it is on the i+2 location. Also we need to count all closing brackets (starting at i+4).
            //let j = i + 4;
            //let tmpBracketControlDepth = bracketControll.depth;
            //while (data[j].includes('}')) {
            //    tmpBracketControlDepth--;
            //    j++;
            //}
            skeleton.addNode(parseEndSite(data[i + 2], bracketControll, parent));
            bracketControll.depth++;
            //bracketControll.depth = tmpBracketControlDepth;
        }

        if (data[i].includes('}') == true)
            bracketControll.depth--;
    }

    console.log(skeleton);
    return skeleton;
}

function parseNextNode(data, parent, depth) {
    node = {
        name: data[0].trim().split(' ')[1],
        isRoot: false,
        offset: { x: 0, y: 0, z: 0 },
        channels: [],
        parent: parent,
        depth: depth,
    }

    if (depth == 0)
        node.isRoot = true;

    for (let i = 0; i < data.length; i++) {
        if (data[i].includes('OFFSET') == true) {
            let tmp = data[i].split(' ');
            node.offset.z = parseFloat(tmp.pop());
            node.offset.y = parseFloat(tmp.pop());
            node.offset.x = parseFloat(tmp.pop());
        }

        if (data[i].includes('CHANNELS') == true) {
            let tmp = data[i].split(' ').slice(2);
            for (let i = 0; i < tmp.length; i++) {
                node.channels.push(tmp[i]);
            };
        }
    }
    return node;
};

function findParent(skeleton, depth) {
    let tmp = skeleton.nodes.slice().reverse();
    for (let i = 0; i < tmp.length; i++) {
        if (tmp[i].depth == (depth - 1))
            return tmp[i].name;
    };

    return '';
}

function parseEndSite(data, bracketControll, parent) {
    node = {
        name: 'End Site',
        isRoot: false,
        offset: { x: 0, y: 0, z: 0 },
        channels: [],
        parent: parent,
        depth: bracketControll.depth,
    };

    let tmp = data.split(' ');
    node.offset.z = parseFloat(tmp.pop());
    node.offset.y = parseFloat(tmp.pop());
    node.offset.x = parseFloat(tmp.pop());

    return node;
}

//-----------------------parsing motion--------------

function parseMotion(data) {

    for (let i = 0; i < skeleton.nodesCount; i++) {
        if (skeleton.nodes[i].name != "End Site") {
            motionValues.addMotion(new Motion(i)); //end site dont have channels and motion values, only offset
            //skeleton.nodes[i].channels = skeleton.nodes[i].channels.split(' '); 
        }
    }


    for (let i = 0; i < data.length; i++) {
        let endSiteCount = 0;
        let tmpData = data[i].split(' ');
        tmpData.reverse();

        // itertation trough skeleton nodes
        for (let j = 0; j < skeleton.nodesCount; j++) {
            if (skeleton.nodes[j].name != "End Site") {
                let channelsOrder = skeleton.nodes[j].channels;

                // itertation trough motion values for exact node
                for (let k = 0; k < channelsOrder.length; k++) {
                    switch (channelsOrder[k]) {
                        case 'Xposition':
                            motionValues.values[j - endSiteCount].tranX.push(parseFloat(tmpData.pop()));
                            break;
                        case 'Yposition':
                            motionValues.values[j - endSiteCount].tranY.push(parseFloat(tmpData.pop()));
                            break;
                        case 'Zposition':
                            motionValues.values[j - endSiteCount].tranZ.push(parseFloat(tmpData.pop()));
                            break;
                        case 'Xrotation':
                            motionValues.values[j - endSiteCount].rotX.push(parseFloat(tmpData.pop()));
                            break;
                        case 'Yrotation':
                            motionValues.values[j - endSiteCount].rotY.push(parseFloat(tmpData.pop()));
                            break;
                        case 'Zrotation':
                            motionValues.values[j - endSiteCount].rotZ.push(parseFloat(tmpData.pop()));
                            break;
                        default:
                            break;
                    }
                }
            }
            else
                endSiteCount++;
        }
    }

    console.log(motionValues);
    composeLocalTransformations();
}

//-------------------translation nad rotation matrices--------------------

//for testing
let identityMatrix = [
    1, 0, 0, 0,
    0, 1, 0, 0,
    0, 0, 1, 0,
    0, 0, 0, 1
];

let testMatrix = [
    -1, 0, 3, 0,
    0, 3, 0, 0,
    0, 9, 2, 0,
    4, 1, 4, 1
]


function MatrixPointMultiply(matrix, point) {
    let c0r0 = matrix[0], c1r0 = matrix[1], c2r0 = matrix[2], c3r0 = matrix[3];
    let c0r1 = matrix[4], c1r1 = matrix[5], c2r1 = matrix[6], c3r1 = matrix[7];
    let c0r2 = matrix[8], c1r2 = matrix[9], c2r2 = matrix[10], c3r2 = matrix[11];
    let c0r3 = matrix[12], c1r3 = matrix[13], c2r3 = matrix[14], c3r3 = matrix[15];

    let x = point[0];
    let y = point[1];
    let z = point[2];
    let w = point[3];

    let resultX = (x * c0r0) + (y * c0r1) + (z * c0r2) + (w * c0r3);
    let resultY = (x * c1r0) + (y * c1r1) + (z * c1r2) + (w * c1r3);
    let resultZ = (x * c2r0) + (y * c2r1) + (z * c2r2) + (w * c2r3);
    let resultW = (x * c3r0) + (y * c3r1) + (z * c3r2) + (w * c3r3);

    return [resultX, resultY, resultZ, resultW];
}

function MatrixMatrixMultiply(matrixA, matrixB) {
    // Slice the second matrix up into rows
    let row0 = [matrixB[0], matrixB[1], matrixB[2], matrixB[3]];
    let row1 = [matrixB[4], matrixB[5], matrixB[6], matrixB[7]];
    let row2 = [matrixB[8], matrixB[9], matrixB[10], matrixB[11]];
    let row3 = [matrixB[12], matrixB[13], matrixB[14], matrixB[15]];

    // Multiply each row by matrixA
    let result0 = MatrixPointMultiply(matrixA, row0);
    let result1 = MatrixPointMultiply(matrixA, row1);
    let result2 = MatrixPointMultiply(matrixA, row2);
    let result3 = MatrixPointMultiply(matrixA, row3);

    // Turn the result rows back into a single matrix
    return [
        result0[0], result0[1], result0[2], result0[3],
        result1[0], result1[1], result1[2], result1[3],
        result2[0], result2[1], result2[2], result2[3],
        result3[0], result3[1], result3[2], result3[3]
    ];
}


function translationMatrix(x, y, z) {
    return [
        1, 0, 0, 0,
        0, 1, 0, 0,
        0, 0, 1, 0,
        x, y, z, 1
    ];
}

function rotXMatrix(angle) {
    return [
        1, 0, 0, 0,
        0, Math.cos(angle), -(Math.sin(angle)), 0,
        0, Math.sin(angle), Math.cos(angle), 0,
        0, 0, 0, 1
    ];
}

function rotZMatrix(angle) {
    return [
        Math.cos(angle), -(Math.sin(angle)), 0, 0,
        Math.sin(angle), Math.cos(angle), 0, 0,
        0, 0, 1, 0,
        0, 0, 0, 1
    ];
}

function rotYMatrix(angle) {
    return [
        Math.cos(angle), 0, Math.sin(angle), 0,
        0, 1, 0, 0,
        -(Math.sin(angle)), 0, Math.cos(angle), 0,
        0, 0, 0, 1
    ];
}

function transformationMatrix(x, y, z, rotX, rotY, rotZ) {
    let Transformation = translationMatrix(x, y, z);
    Transformation = MatrixMatrixMultiply(Transformation, rotZMatrix(rotZ));
    Transformation = MatrixMatrixMultiply(Transformation, rotXMatrix(rotX));
    Transformation = MatrixMatrixMultiply(Transformation, rotYMatrix(rotY));
    return Transformation;
}

//--------------------matrix values of motion--------------------

function composeLocalTransformations() {
    for (let i = 0; i < skeleton.nodesCount; i++) {
        if (skeleton.nodes[i].name != "End Site") {
            //localTransformations.addTransformation(identityMatrix);
        }
    }

    for (let i = 0; i < frames.count; i++) {
        //frames.data[i] = {};
        let tmpTransform = [];
        let endSiteCount = 0;
        for (let j = 0; j < skeleton.nodesCount; j++) {
            if (skeleton.nodes[j].name != 'End Site') {
                if (!skeleton.nodes[j].localTransform) {
                    skeleton.nodes[j].localTransform = [];
                }
                let tmpData = transformationMatrix(skeleton.nodes[j].offset.x + motionValues.values[j - endSiteCount].tranX[i],
                    skeleton.nodes[j].offset.y + motionValues.values[j - endSiteCount].tranY[i],
                    skeleton.nodes[j].offset.z + motionValues.values[j - endSiteCount].tranZ[i],
                    motionValues.values[j - endSiteCount].rotX[i],
                    motionValues.values[j - endSiteCount].rotY[i],
                    motionValues.values[j - endSiteCount].rotZ[i]);
                //tmpTransform.push(tmpData)
                skeleton.nodes[j].localTransform.push(tmpData);
                //localTransformations.addTransformation(tmpTransform);

            }
            else
                endSiteCount++;
        }
        //frames.localMatrix.push(tmpTransform);
    }
    composeGlobalTransformations();
    computeXYZ();
    console.log(frames);
}

function composeGlobalTransformations() {
    for (let i = 0; i < skeleton.nodesCount; i++) {
        let parentIndex = 0;
        if (skeleton.nodes[i].name != 'End Site') {
            if (!skeleton.nodes[i].globalTransform) {
                skeleton.nodes[i].globalTransform = [];
                if (i == 0) {
                    skeleton.nodes[0].globalTransform = skeleton.nodes[0].localTransform;
                    continue;
                }
            }
            for (let k = 0; k < skeleton.nodesCount; k++) {
                if (skeleton.nodes[i].parent == skeleton.nodes[k].name)
                    parentIndex = k;
            }

            for (let j = 0; j < frames.count; j++) {

                skeleton.nodes[i].globalTransform.push(MatrixMatrixMultiply(skeleton.nodes[parentIndex].globalTransform[j], skeleton.nodes[i].localTransform[j]));
            }
        }
        //else
        //end site parse 
    }
}

function computeXYZ() {
    let origin = [0, 0, 0, 1];
    for (let i = 0; i < skeleton.nodesCount; i++) {
        if (skeleton.nodes[i].name != 'End Site') {
            if (!skeleton.nodes[i].posXYZ) {
                skeleton.nodes[i].posXYZ = [];
            }
            for (let j = 0; j < frames.count; j++) {
                skeleton.nodes[i].posXYZ.push(MatrixPointMultiply(skeleton.nodes[i].globalTransform[j], origin));
            }

        }
    }

}

function recurGlobalTransform(node) {
    for (let i = 0; i < skeleton.nodesCount; i++) {
        let j;
        if (skeleton.nodes[i].name == node.parent)
            for (j = 0; j < frames.count; j++) {
                return MatrixMatrixMultiply(recurGlobalTransform(skeleton.nodes[i]), node.localTransform[j]);
            }
        else
            return skeleton.nodes[0].localTransform[j];

    }
}


//---------------------------static data--------------------------
let skeleton = new Skeleton();
let frames = new Frames();
let motionValues = new MotionValues();
let localTransformations = new LocalMatrixTransformations();
//------------------------------------Data Models--------------------
function Skeleton() {
    this.nodes = [];
    this.nodesCount = 0;
    this.addNode = function (node) {
        this.nodes.push(node);
        this.nodesCount++;
    }
}

function Frames() {
    this.count = 0;
    this.localMatrix = [];
    this.data = [{
        positions: [],
        frame: 0,
    }]

}

function MotionValues() {
    this.values = [];
    this.addMotion = function (motion) {
        this.values.push(motion);
    }
}

function Node(name, isRoot, offset, channels, parent, depth) {
    this.name = name;
    this.isRoot = isRoot;
    this.offset = offset;
    this.channels = channels;
    this.parent = parent;
    this.depth = depth;
    this.localTransform = [];
    this.globalTransform = [];
    this.posXYZ = [];
}

function Motion(id) {
    this.nodeId = id;
    this.tranX = [];
    this.tranY = [];
    this.tranZ = [];
    this.rotX = [];
    this.rotY = [];
    this.rotZ = [];
}

function LocalMatrixTransformations() {
    this.transformation = [];
    this.addTransformation = function (transform) {
        this.transformation.push(transform);
    }
}
