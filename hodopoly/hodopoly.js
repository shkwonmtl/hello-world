/* 
 * Hodograph Control Curve example
 *
 * By Song-Hwa Kwon		email: skwon@catholic.ac.kr 
 * 
 */

import {GLegF, GLobF, BernF, Poly, polyEval, getBarySum, constructPolyList, getDerivList, getSVG_controlPoly, 
    computePolygonLength, getPolyCurvePt, getPolyCurvePtNorm, getArcLengthFromPolyDerivSimpson} from './hodo.js';


// GLobF, GLegF, BernF, 
(function() {

    let ptCount = 5;
    let ndeg = ptCount - 1;
    // let need_construct_points = false;
    let svgns = "http://www.w3.org/2000/svg";

    var container, svg, cType, code, point = {}, line = {}, fill = false, drag = null, dPoint, maxX, maxY, pg;
    let curves = {};
    let nextptid = 0;
    let GLobPolyList = [], GLegPolyList = [], BernPolyList = [];
    let GLobPolyDList = [], GLegPolyDList = [], BernPolyDList = [];
    let polygonLen = 0, GLobLen = 0, GLegLen = 0, BezierLen = 0;
    let max_deg = GLobF.length;

    let curve_type = {
        Polygon:true,
        GLeg:false, 
        GLob:true, 
        Bezier:false}; //Polygon, GLeg, GLob, Bezier

    //chart
    const labels = [
        'Polygon',
        'Gauss-Legendre',
        'Gauss-Lobatto',
        'Bezier'
    ];
    
    const data = {
        labels: labels,
        datasets: [{
          label: 'Length',
          backgroundColor: ['rgba(0, 0, 0, 0.2)', 'rgba(0, 0, 255)', 'rgba(255, 0, 0)', 'rgba(0, 0, 0)'],
          borderColor: ['rgb(0, 0, 0)','rgb(0, 0, 255)', 'rgb(255, 0, 0)', 'rgba(0, 0, 0)'],
          data: [795.779, 697.953, 651.357, 418.043],
        }]
    };
    
    const config = {
        type: 'bar',
        data: data,
        options: {responsive:false}
    };
    
    let myChart;
      
    
    function getCurveTypes() {
        let c = document.getElementsByName("curvetype");
        for(let i = 0; i < c.length; i++) {
            // curve_type[c[i].getAttributeNS(null,"value")] = c[i].checked;
            curve_type[c[i].value] = c[i].checked;
        }
    }

    function ClickCheck(e) {
        getCurveTypes();
        DrawSVG();
    }

    function ClickAddPoint(){
        // let container = document.getElementById("svg");
        // container = document.getElementById( 'svg' );
    
        if(addpoint(100,200)) {
            construct_points();
            DrawSVG();
        }       
    }

    function addpoint(x, y){
        // let container = document.getElementById("svg");
        // container = document.getElementById( 'svg' );
        if(ptCount > max_deg) return false;

        if (svg) {
            // cType = container.className;
            // maxX = container.offsetWidth-1;
            // maxY = container.offsetHeight-1;
            // let svg = container.contentDocument;
            let main = svg.getElementById("main");
    
            let new_pt = document.createElementNS(svgns, 'circle');
        
            new_pt.setAttribute('id', 'p'+ptCount);
            new_pt.setAttributeNS(null, 'cx', x); 
            new_pt.setAttributeNS(null, 'cy', y); 
            new_pt.setAttributeNS(null, 'r', 8); 
    
            main.appendChild(new_pt);
            ptCount ++;
            return true;
        }
        return false;
    }

    function ClickRemoveLastPoint(){
        // let container = document.getElementById("svg");
        // container = document.getElementById( 'svg' );
    
        if(removeLastPt()) {
            construct_points();
            DrawSVG();
        }       
    }

    function removeLastPt() {
        if(ptCount < 3) return false;

        if(svg) {
            // let main = svg.getElementById("main");
            let c = svg.getElementsByTagName("circle");
            // let lastpt = svg.getElementById(c[c.length-1].id);
            let lastpt = c[c.length-1];
            let parent = lastpt.parentNode; // parent == main
            parent.removeChild(lastpt);
            ptCount --;
            return true;
        }
        return false;
    }

    function ex01() {
        // x0, y0, x1, y1, ..., xn, yn
        let coord = [44,335,114,161,71,142,127,320,201,194,249,327,296,184,190,203,294,211,370,182,394,332,446,197,489,258,600,241,553,196,510,299,573,322,611,291];
        setCtrlPtsFromCoordinates(coord);
    }

    function ex02() {
        let coord = [46,310,125,143,71,142,127,320,205,186,215,322,296,184,190,203,295,197,370,182,394,332,442,174,489,258,600,241,553,196,518,327,617,262];
        setCtrlPtsFromCoordinates(coord);
    }

    function setCtrlPtsFromCoordinates(coord) {
        let n = Math.floor(coord.length/2);
        let ctlptlist = [];
        for(let i = 0; i < n; i++) {
            ctlptlist.push([coord[i*2],coord[i*2+1]]);
        }
        if(setCtrlPts(ctlptlist)) {
            construct_points();
            DrawSVG();
        }
    }

    function setCtrlPts(ctlptlist) {
        let n = ctlptlist.length;
        if(n < 2) return false;
        n = Math.min(n, max_deg+1);

        let c, i, m;
        m = Math.min(n, ptCount);

        c = svg.getElementsByTagName("circle");
    	for (i = 0; i < m; i++) {
            c[i].setAttributeNS(null, "cx", ctlptlist[i][0]);
            c[i].setAttributeNS(null, "cy", ctlptlist[i][1]);
        }

        let ret = true, num = ptCount - n;
        if(num > 0) {
            for(i=0; ret && i < num; i++) {
                ret &&= removeLastPt();
            }
        } else if(num < 0) {
            for(i=m; ret && i < n; i++) {
                ret &&= addpoint(ctlptlist[i][0], ctlptlist[i][1]);
            }
        }

        return ret;
    }

    // construct points
    function construct_points() {
        var c = svg.getElementsByTagName("circle");
        point = {};
        ptCount = c.length;
        ndeg = ptCount - 1;
		for (var i = 0; i < c.length; i++) {
			point[c[i].getAttributeNS(null,"id")] = {
				x: parseInt(c[i].getAttributeNS(null,"cx"),10),
				y: parseInt(c[i].getAttributeNS(null,"cy"),10)
			};
		}
    }

	// define initial points
	function Init() {

		// var c = svg.getElementsByTagName("circle");
		construct_points();
        nextptid = ptCount;
        getCurveTypes();
		
		// lines
        pg = svg.getElementById("pg1");
		// line.l1 = svg.getElementById("l1");
		// line.l2 = svg.getElementById("l2");
		// line.curve = svg.getElementById("curve");
        // line.curve2 = svg.getElementById("curve2");

        curves.glegcurve = svg.getElementById("glegcurve");
        curves.globcurve = svg.getElementById("globcurve");
        curves.beziercurve = svg.getElementById("beziercurve");
		
		// code
		code = document.getElementById("code");
	
		// event handlers
		svg.onmousedown = svg.onmousemove = svg.onmouseup = Drag;
		svg.ontouchstart = svg.ontouchmove = svg.ontouchend = Drag;
        let btn = document.getElementById("addbtn");
        // btn.setAttribute("onClick", "addpoint()");
        btn.onclick = ClickAddPoint;

        btn = document.getElementById("rmvbtn");
        btn.onclick = ClickRemoveLastPoint;

        btn = document.getElementById("ex01btn");
        btn.onclick = ex01;
        btn = document.getElementById("ex02btn");
        btn.onclick = ex02;

        let chkboxes = document.getElementsByName("curvetype");
        for(let i=0; i < chkboxes.length; i++) {
            chkboxes[i].onclick = ClickCheck;
        }
		

        // GLobF, GLegF, BernF
        GLobPolyList = constructPolyList(GLobF);
        GLegPolyList = constructPolyList(GLegF);
        BernPolyList = constructPolyList(BernF);
        GLobPolyDList = getDerivList(GLobPolyList);
        GLegPolyDList = getDerivList(GLegPolyList);
        BernPolyDList = getDerivList(BernPolyList);


        
        // let pointlist = [ [0,1], [2,0], [2,1], [3,2], [3,5]];
        // let colist = polyEval(GLobPoly, -1.0);
        // let pt = getBarySum(colist, pointlist);
        // console.log(pt);
        // console.log(Math.round(pt[0]) + " " + Math.round(pt[1]));
       
		DrawSVG();
	}
	
	
	// draw curve
	function DrawSVG() {
	
        // if(need_construct_points) {
        //     construct_points();
        //     need_construct_points = false;
        // }
            

		// control line 1
		// line.l1.setAttributeNS(null, "x1", point.p0.x);
		// line.l1.setAttributeNS(null, "y1", point.p0.y);
		// line.l1.setAttributeNS(null, "x2", point.p1.x);
		// line.l1.setAttributeNS(null, "y2", point.p1.y);
		
		// control line 2
		// var c2 = (point.c2 ? "c2" : "c1");
		// line.l2.setAttributeNS(null, "x1", point.p2.x);
		// line.l2.setAttributeNS(null, "y1", point.p2.y);
		// line.l2.setAttributeNS(null, "x2", point.p3.x);
		// line.l2.setAttributeNS(null, "y2", point.p3.y);
		
		// curve
		// var d = 
		// 	"M"+point.p0.x+","+point.p0.y+" "+cType+
		// 	point.p1.x+","+point.p1.y+" "+
		// 	(point.p2 ? point.p2.x+","+point.p2.y+" " : "")+
		// 	point.p3.x+","+point.p3.y+
		// 	(fill ? " Z" : "");
        // var d = `M${point.p0.x},${point.p0.y} `;
		// line.curve.setAttributeNS(null, "d", d);
		
        //polygon
        let pts = "";
        let ctlptlist = [];
        var c = Object.keys(point);
        for (var i = 0; i < c.length; i++) {
			pts += " " + point[c[i]].x + "," + point[c[i]].y;
            ctlptlist.push( [ point[c[i]].x, point[c[i]].y ]);
		}

    
        let ctlpolygonLen = computePolygonLength(ctlptlist);
        if(curve_type.Polygon) {
            pg.setAttributeNS(null,"points", pts);
            polygonLen = ctlpolygonLen;
            // for(let i=0; i < c.length; i++) {
            //     point[c[i]].style.color = "red";
            // }
        } else {
            pg.setAttributeNS(null,"points", "");
            polygonLen = 0;
            // for(let i=0; i < c.length; i++) {
            //     point[c[i]].style.color = "white";
            // }
        }

        let circles = svg.getElementsByTagName("circle");
        let circol = curve_type.Polygon ? "red": "white";
        for(let i=0; i < circles.length; i++) {
            circles[i].style.stroke = circol;
        }

        //curves
        let d = "M"+point.p0.x+","+point.p0.y;
        // for (var i = 1; i < c.length; i++) {
		// 	d += "L" + point[c[i]].x + "," + point[c[i]].y;
		// }
        // let ndiv = 40*ptCount; //200;
        let ndiv = Math.floor(ctlpolygonLen/3)+1;
        // let ndivSimpson = 100;
        let ndivSimpson = Math.floor(ndiv/2)+1;

        if(curve_type.GLeg) {
            d = getSVG_controlPoly(GLegPolyList, ctlptlist, ndiv);
            GLegLen = getArcLengthFromPolyDerivSimpson(GLegPolyDList[ndeg-1], ctlptlist, -1,1,ndivSimpson);
        } else {
            d = "M"+point.p0.x+","+point.p0.y;
            GLegLen = 0;
        }
        curves.glegcurve.setAttributeNS(null, "d", d);

        if(curve_type.GLob && ptCount > 2) {
            d = getSVG_controlPoly(GLobPolyList, ctlptlist, ndiv);
            GLobLen = getArcLengthFromPolyDerivSimpson(GLobPolyDList[ndeg-1], ctlptlist, -1,1,ndivSimpson);
        } else {
            d = "M"+point.p0.x+","+point.p0.y;
            GLobLen = 0;
        }
        curves.globcurve.setAttributeNS(null, "d", d);

        if(curve_type.Bezier) {
            d = getSVG_controlPoly(BernPolyList, ctlptlist, ndiv);
            BezierLen = getArcLengthFromPolyDerivSimpson(BernPolyDList[ndeg-1], ctlptlist, -1,1,ndivSimpson);
        } else {
            d = "M"+point.p0.x+","+point.p0.y;
            BezierLen = 0;
        }
        curves.beziercurve.setAttributeNS(null, "d", d);


        // d = getSVG_controlPoly(GLobPolyList, ctlptlist, ndiv);
        // line.curve2.setAttributeNS(null,"d", d);

		// show code
		if (code) {
			// code.textContent = '<path d="'+d+'" />';
            code.textContent = ctlptlist;
		}

        //curve length
        // data.data[0] = polylength;
        // myChart.data.data[0] = polylength;
        myChart.data.datasets[0].data[0] = polygonLen;
        myChart.data.datasets[0].data[1] = GLegLen;
        myChart.data.datasets[0].data[2] = GLobLen;
        myChart.data.datasets[0].data[3] = BezierLen;
        myChart.update();
	}
	
	
	// drag event handler
	function Drag(e) {
        
		e.stopPropagation();
		var t = e.target, id = t.id, et = e.type, m = MousePos(e);
	
		// toggle fill class
		if (!drag && et == "mousedown" && id == "curve") {
			// fill = !fill;
			t.setAttributeNS(null, "class", (fill ? "fill" : ""));
			DrawSVG();
		}
	
		// start drag
		if (!drag && typeof(point[id]) != "undefined" && (et == "mousedown" || et == "touchstart")) {
			drag = t;
			dPoint = m;
            // if(e.shiftKey) console.log("mouse+shift:" + id);
		} 

        //add point
        if(!drag && typeof(point[id]) == "undefined" && (et == "mousedown" || et == "touchstart")) {
            if(e.shiftKey) {
                // console.log("mouse+shift:undefined");
                if(addpoint(m.x, m.y)) {
                    construct_points();
                    DrawSVG();
                } 
            } 
        }
		
		// drag
		if (drag && (et == "mousemove" || et == "touchmove")) {
			id = drag.id;
			point[id].x += m.x - dPoint.x;
			point[id].y += m.y - dPoint.y;
			dPoint = m;
			drag.setAttributeNS(null, "cx", point[id].x);
			drag.setAttributeNS(null, "cy", point[id].y);
			DrawSVG();
		}
		
		// stop drag
		if (drag && (et == "mouseup" || et == "touchend")) {
			drag = null;
		}
	
	}

	
	// mouse position
	function MousePos(event) {
		return {
			x: Math.max(0, Math.min(maxX, event.pageX)),
			y: Math.max(0, Math.min(maxY, event.pageY))
		}
	}

    


	
	
	// start
	window.onload = function() {
        // let btn = document.getElementById("addbtn");
        // // btn.setAttribute("onClick", "addpoint()");
        // btn.onclick = addpoint;
        myChart = new Chart(
            document.getElementById('myChart'),
            config
        );

		container = document.getElementById("svg");

		if (container) {
			cType = container.className;
			maxX = container.offsetWidth-1;
			maxY = container.offsetHeight-1;
			svg = container.contentDocument;// need "% python3 -m http.server" in terminal
			Init();            
		}
	}
	
})();

 


