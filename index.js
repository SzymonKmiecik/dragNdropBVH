
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
//------------------------------------BVH data and logic--------------------
function Skeleton() {
    this.nodes = [];
    this.nodesCount = 0;
    this.addNode = function (node) {
        this.nodes.push(node);
        this.nodesCount++;
    }
}

function Frames() {
    this.positions = [];
}

function MotionValues() {
    this.values = [];
    this.addMotion = function (motion) {
        this.values.push(motion);
    }
}

let skeleton = new Skeleton();
let frames = new Frames();
let motionValues = new MotionValues();

function Node(name, isRoot, offset, channels, parent, depth) {
    this.name = name;
    this.isRoot = isRoot;
    this.offset = offset;
    this.channels = channels;
    this.parent = parent;
    this.depth = depth;
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
}