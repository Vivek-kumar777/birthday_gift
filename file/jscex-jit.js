(function () {
    
    var codeGenerator = (typeof eval("(function () {})") == "function") ?
        function (code) { return code; } :
        function (code) { return "false || " + code; };
        
    var stringify = (typeof JSON !== "undefined" && JSON.stringify) ?
        function (s) { return JSON.stringify(s); } :
        (function () {
            var escapable = /[\\\"\x00-\x1f\x7f-\x9f\u00ad\u0600-\u0604\u070f\u17b4\u17b5\u200c-\u200f\u2028-\u202f\u2060-\u206f\ufeff\ufff0-\uffff]/g;
            var meta = {'\b':'\\b','\t':'\\t','\n':'\\n','\f':'\\f','\r':'\\r','"':'\\"','\\':'\\\\'};
            return function (s) {
                escapable.lastIndex = 0;
                return escapable.test(s) ? '"' + s.replace(escapable, function (a) {
                    var c = meta[a];
                    return typeof c === 's' ? c : '\\u' + ('0000' + a.charCodeAt(0).toString(16)).slice(-4);
                }) + '"' : '"' + s + '"';
            };
        })();
    
    if (typeof __jscex__tempVarSeed === "undefined") {
        __jscex__tempVarSeed = 0;
    }

    var init = function (root) {
        if (root.modules["jit"]) return;
    
        function JscexTreeGenerator(binder) {
            this._binder = binder;
            this._root = null;
        }
        JscexTreeGenerator.prototype = {
            generate: function (ast) {
                var params = ast[2], statements = ast[3];
                this._root = { type: "delay", stmts: [] };
                this._visitStatements(statements, this._root.stmts);
                return this._root;
            },
            _getBindInfo: function (stmt) {
                var type = stmt[0];
                if (type == "stat") {
                    var expr = stmt[1];
                    if (expr[0] == "call") {
                        var callee = expr[1];
                        if (callee[0] == "name" && callee[1] == this._binder && expr[2].length == 1) {
                            return { expression: expr[2][0], argName: "", assignee: null };
                        }
                    } else if (expr[0] == "assign") {
                        var assignee = expr[2];
                        expr = expr[3];
                        if (expr[0] == "call") {
                            var callee = expr[1];
                            if (callee[0] == "name" && callee[1] == this._binder && expr[2].length == 1) {
                                return { expression: expr[2][0], argName: "$$_result_$$", assignee: assignee };
                            }
                        }
                    }
                } else if (type == "var") {
                    var defs = stmt[1];
                    if (defs.length == 1) {
                        var item = defs[0];
                        var name = item[0];
                        var expr = item[1];
                        if (expr && expr[0] == "call") {
                            var callee = expr[1];
                            if (callee[0] == "name" && callee[1] == this._binder && expr[2].length == 1) {
                                return { expression: expr[2][0], argName: name, assignee: null };
                            }
                        }
                    }
                } else if (type == "return") {
                    var expr = stmt[1];
                    if (expr && expr[0] == "call") {
                        var callee = expr[1];
                        if (callee[0] == "name" && callee[1] == this._binder && expr[2].length == 1) {
                            return { expression: expr[2][0], argName: "$$_result_$$", assignee: "return" };
                        }
                    }
                }
                return null;
            },
            _visitStatements: function (statements, stmts, index) {
                if (arguments.length <= 2) index = 0;
                if (index >= statements.length) { stmts.push({ type: "normal" }); return this; }
                var currStmt = statements[index];
                var bindInfo = this._getBindInfo(currStmt);
                if (bindInfo) {
                    var bindStmt = { type: "bind", info: bindInfo };
                    stmts.push(bindStmt);
                    if (bindInfo.assignee != "return") {
                        bindStmt.stmts = [];
                        this._visitStatements(statements, bindStmt.stmts, index + 1);
                    }
                } else {
                    var type = currStmt[0];
                    if (type == "return" || type == "break" || type == "continue" || type == "throw") {
                        stmts.push({ type: type, stmt: currStmt });
                    } else if (type == "if" || type == "try" || type == "for" || type == "do" || type == "while" || type == "switch" || type == "for-in") {
                        var newStmt = this._visit(currStmt);
                        if (newStmt.type == "raw") {
                            stmts.push(newStmt);
                            this._visitStatements(statements, stmts, index + 1);
                        } else {
                            var isLast = (index == statements.length - 1);
                            if (isLast) {
                                stmts.push(newStmt);
                            } else {
                                var combineStmt = { type: "combine", first: { type: "delay", stmts: [newStmt] }, second: { type: "delay", stmts: [] } };
                                stmts.push(combineStmt);
                                this._visitStatements(statements, combineStmt.second.stmts, index + 1);
                            }
                        }
                    } else {
                        stmts.push({ type: "raw", stmt: currStmt });
                        this._visitStatements(statements, stmts, index + 1);
                    }
                }
                return this;
            },
            _visit: function (ast) {
                var type = ast[0];
                var visitor = this._visitors[type];
                if (visitor) return visitor.call(this, ast);
                else throw new Error('"' + type + '" is not currently supported.');
            },
            _visitBody: function (ast, stmts) {
                if (ast[0] == "block") this._visitStatements(ast[1], stmts);
                else this._visitStatements([ast], stmts);
            },
            _noBinding: function (stmts) {
                switch (stmts[stmts.length - 1].type) {
                    case "normal": case "return": case "break": case "throw": case "continue": return true;
                }
                return false;
            },
            _collectCaseStatements: function (cases, index) {
                var res = [];
                for (var i = index; i < cases.length; i++) {
                    var rawStmts = cases[i][1];
                    for (var j = 0; j < rawStmts.length; j++) {
                        if (rawStmts[j][0] == "break") return res;
                        res.push(rawStmts[j]);
                    }
                }
                return res;
            },
            _visitors: {
                "for": function (ast) {
                    var bodyStmts = [];
                    this._visitBody(ast[4], bodyStmts);
                    if (this._noBinding(bodyStmts)) return { type: "raw", stmt: ast };
                    var delayStmt = { type: "delay", stmts: [] };
                    if (ast[1]) delayStmt.stmts.push({ type: "raw", stmt: ast[1] });
                    var loopStmt = { type: "loop", bodyFirst: false, bodyStmt: { type: "delay", stmts: bodyStmts } };
                    delayStmt.stmts.push(loopStmt);
                    if (ast[2]) loopStmt.condition = ast[2];
                    if (ast[3]) loopStmt.update = ast[3];
                    return delayStmt;
                },
                "for-in": function (ast) {
                    var bodyStmts = [];
                    this._visitBody(ast[4], bodyStmts);
                    if (this._noBinding(bodyStmts)) return { type: "raw", stmt: ast };
                    var id = (__jscex__tempVarSeed++);
                    var keysVar = "$$_keys_$$_" + id, indexVar = "$$_index_$$_" + id;
                    var delayStmt = { type: "delay", stmts: [] };
                    var keysAst = root.parse("var " + keysVar + " = Jscex._forInKeys(obj);")[1][0];
                    keysAst[1][0][1][2][0] = ast[3];
                    delayStmt.stmts.push({ type: "raw", stmt: keysAst });
                    delayStmt.stmts.push({ type: "raw", stmt: root.parse("var " + indexVar + " = 0;")[1][0] });
                    var condition = root.parse(indexVar + " < " + keysVar + ".length")[1][0][1];
                    var update = root.parse(indexVar + "++")[1][0][1];
                    var loopStmt = { type: "loop", bodyFirst: false, update: update, condition: condition, bodyStmt: { type: "delay", stmts: [] } };
                    delayStmt.stmts.push(loopStmt);
                    var varName = ast[2][1];
                    if (ast[1][0] == "var") {
                        loopStmt.bodyStmt.stmts.push({ type: "raw", stmt: root.parse("var " + varName + " = " + keysVar + "[" + indexVar + "];")[1][0] });
                    } else {
                        loopStmt.bodyStmt.stmts.push({ type: "raw", stmt: root.parse(varName + " = " + keysVar + "[" + indexVar + "];")[1][0] });
                    }
                    this._visitBody(ast[4], loopStmt.bodyStmt.stmts);
                    return delayStmt;
                },
                "while": function (ast) {
                    var bodyStmts = [];
                    this._visitBody(ast[2], bodyStmts);
                    if (this._noBinding(bodyStmts)) return { type: "raw", stmt: ast };
                    var loopStmt = { type: "loop", bodyFirst: false, condition: ast[1], bodyStmt: { type: "delay", stmts: bodyStmts } };
                    return loopStmt;
                },
                "do": function (ast) {
                    var bodyStmts = [];
                    this._visitBody(ast[2], bodyStmts);
                    if (this._noBinding(bodyStmts)) return { type: "raw", stmt: ast };
                    return { type: "loop", bodyFirst: true, condition: ast[1], bodyStmt: { type: "delay", stmts: bodyStmts } };
                },
                "switch": function (ast) {
                    var noBinding = true;
                    var switchStmt = { type: "switch", item: ast[1], caseStmts: [] };
                    var cases = ast[2];
                    for (var i = 0; i < cases.length; i++) {
                        var caseStmt = { item: cases[i][0], stmts: [] };
                        switchStmt.caseStmts.push(caseStmt);
                        var statements = this._collectCaseStatements(cases, i);
                        this._visitStatements(statements, caseStmt.stmts);
                        noBinding = noBinding && this._noBinding(caseStmt.stmts);
                    }
                    return noBinding ? { type: "raw", stmt: ast } : switchStmt;
                },
                "if": function (ast) {
                    var noBinding = true;
                    var ifStmt = { type: "if", conditionStmts: [] };
                    var currAst = ast;
                    while (true) {
                        var condStmt = { cond: currAst[1], stmts: [] };
                        ifStmt.conditionStmts.push(condStmt);
                        this._visitBody(currAst[2], condStmt.stmts);
                        noBinding = noBinding && this._noBinding(condStmt.stmts);
                        if (currAst[3] && currAst[3][0] == "if") currAst = currAst[3];
                        else break;
                    }
                    if (currAst[3]) {
                        ifStmt.elseStmts = [];
                        this._visitBody(currAst[3], ifStmt.elseStmts);
                        noBinding = noBinding && this._noBinding(ifStmt.elseStmts);
                    }
                    return noBinding ? { type: "raw", stmt: ast } : ifStmt;
                },
                "try": function (ast) {
                    var bodyStmts = [];
                    this._visitStatements(ast[1], bodyStmts);
                    var noBinding = this._noBinding(bodyStmts);
                    var tryStmt = { type: "try", bodyStmt: { type: "delay", stmts: bodyStmts } };
                    if (ast[2]) {
                        tryStmt.exVar = ast[2][0];
                        tryStmt.catchStmts = [];
                        this._visitStatements(ast[2][1], tryStmt.catchStmts);
                        noBinding = noBinding && this._noBinding(tryStmt.catchStmts);
                    }
                    if (ast[3]) {
                        tryStmt.finallyStmt = { type: "delay", stmts: [] };
                        this._visitStatements(ast[3], tryStmt.finallyStmt.stmts);
                        noBinding = noBinding && this._noBinding(tryStmt.finallyStmt.stmts);
                    }
                    return noBinding ? { type: "raw", stmt: ast } : tryStmt;
                }
            }
        };

        function CodeGenerator(builderName, binder, indent) {
            this._builderName = builderName;
            this._binder = binder;
            this._normalMode = false;
            this._indent = indent;
            this._indentLevel = 0;
            this._builderVar = "$$_builder_$$_" + (__jscex__tempVarSeed++);
        }
        CodeGenerator.prototype = {
            _write: function (s) { this._buffer.push(s); return this; },
            _writeLine: function (s) { this._write(s)._write("\n"); return this; },
            _writeIndents: function () {
                for (var i = 0; i < this._indent; i++) this._write(" ");
                for (var i = 0; i < this._indentLevel; i++) this._write("    ");
                return this;
            },
            generate: function (params, jscexAst) {
                this._buffer = [];
                this._writeLine("(function (" + params.join(", ") + ") {");
                this._indentLevel++;
                this._writeIndents()._writeLine("var " + this._builderVar + " = Jscex.builders[" + stringify(this._builderName) + "];");
                this._writeIndents()._writeLine("return " + this._builderVar + ".Start(this,");
                this._indentLevel++;
                this._pos = {};
                this._writeIndents()._visitJscex(jscexAst)._writeLine();
                this._indentLevel--;
                this._writeIndents()._writeLine(");");
                this._indentLevel--;
                this._writeIndents()._write("})");
                return this._buffer.join("");
            },
            _visitJscex: function (ast) { this._jscexVisitors[ast.type].call(this, ast); return this; },
            _visitRaw: function (ast) {
                var visitor = this._rawVisitors[ast[0]];
                if (visitor) visitor.call(this, ast);
                else throw new Error('"' + ast[0] + '" is not currently supported.');
                return this;
            },
            _visitJscexStatements: function (statements) {
                for (var i = 0; i < statements.length; i++) {
                    var stmt = statements[i];
                    if (stmt.type == "raw" || stmt.type == "if" || stmt.type == "switch") {
                        this._writeIndents()._visitJscex(stmt)._writeLine();
                    } else if (stmt.type == "delay") {
                        this._visitJscexStatements(stmt.stmts);
                    } else {
                        this._writeIndents()._write("return ")._visitJscex(stmt)._writeLine(";");
                    }
                }
            },
            _visitRawStatements: function (statements) {
                for (var i = 0; i < statements.length; i++) {
                    var s = statements[i];
                    this._writeIndents()._visitRaw(s)._writeLine();
                    switch (s[0]) { case "break": case "return": case "continue": case "throw": return; }
                }
            },
            _visitRawBody: function (body) {
                if (body[0] == "block") this._visitRaw(body);
                else { this._writeLine(); this._indentLevel++; this._writeIndents()._visitRaw(body); this._indentLevel--; }
                return this;
            },
            _visitRawFunction: function (ast) {
                var funcName = ast[1] || "", args = ast[2], statements = ast[3];
                this._writeLine("function " + funcName + "(" + args.join(", ") + ") {");
                this._indentLevel++;
                var currInFunction = this._pos.inFunction;
                this._pos.inFunction = true;
                this._visitRawStatements(statements);
                this._indentLevel--;
                this._pos.inFunction = currInFunction;
                this._writeIndents()._write("}");
            },
            _jscexVisitors: {
                "delay": function (ast) {
                    if (ast.stmts.length == 1) {
                        var s = ast.stmts[0];
                        switch (s.type) {
                            case "delay": case "combine": case "normal": case "break": case "continue": case "loop": case "try":
                                this._visitJscex(s); return;
                            case "return": if (!s.stmt[1]) { this._visitJscex(s); return; }
                        }
                    }
                    this._writeLine(this._builderVar + ".Delay(function () {");
                    this._indentLevel++;
                    this._visitJscexStatements(ast.stmts);
                    this._indentLevel--;
                    this._writeIndents()._write("})");
                },
                "combine": function (ast) {
                    this._writeLine(this._builderVar + ".Combine(");
                    this._indentLevel++;
                    this._writeIndents()._visitJscex(ast.first)._writeLine(",");
                    this._writeIndents()._visitJscex(ast.second)._writeLine();
                    this._indentLevel--;
                    this._writeIndents()._write(")");
                },
                "loop": function (ast) {
                    this._writeLine(this._builderVar + ".Loop(");
                    this._indentLevel++;
                    if (ast.condition) {
                        this._writeIndents()._writeLine("function () {");
                        this._indentLevel++;
                        this._writeIndents()._write("return ")._visitRaw(ast.condition)._writeLine(";");
                        this._indentLevel--;
                        this._writeIndents()._writeLine("},");
                    } else { this._writeIndents()._writeLine("null,"); }
                    if (ast.update) {
                        this._writeIndents()._writeLine("function () {");
                        this._indentLevel++;
                        this._writeIndents()._visitRaw(ast.update)._writeLine(";");
                        this._indentLevel--;
                        this._writeIndents()._writeLine("},");
                    } else { this._writeIndents()._writeLine("null,"); }
                    this._writeIndents()._visitJscex(ast.bodyStmt)._writeLine(",");
                    this._writeIndents()._writeLine(ast.bodyFirst);
                    this._indentLevel--;
                    this._writeIndents()._write(")");
                },
                "raw": function (ast) { this._visitRaw(ast.stmt); },
                "bind": function (ast) {
                    var info = ast.info;
                    this._write(this._builderVar + ".Bind(")._visitRaw(info.expression)._writeLine(", function (" + info.argName + ") {");
                    this._indentLevel++;
                    if (info.assignee == "return") {
                        this._writeIndents()._writeLine("return " + this._builderVar + ".Return(" + info.argName + ");");
                    } else {
                        if (info.assignee) this._writeIndents()._visitRaw(info.assignee)._writeLine(" = " + info.argName + ";");
                        this._visitJscexStatements(ast.stmts);
                    }
                    this._indentLevel--;
                    this._writeIndents()._write("})");
                },
                "if": function (ast) {
                    for (var i = 0; i < ast.conditionStmts.length; i++) {
                        var stmt = ast.conditionStmts[i];
                        this._write("if (")._visitRaw(stmt.cond)._writeLine(") {");
                        this._indentLevel++;
                        this._visitJscexStatements(stmt.stmts);
                        this._indentLevel--;
                        this._writeIndents()._write("} else ");
                    }
                    this._writeLine("{");
                    this._indentLevel++;
                    if (ast.elseStmts) this._visitJscexStatements(ast.elseStmts);
                    else this._writeIndents()._writeLine("return " + this._builderVar + ".Normal();");
                    this._indentLevel--;
                    this._writeIndents()._write("}");
                },
                "switch": function (ast) {
                    this._write("switch (")._visitRaw(ast.item)._writeLine(") {");
                    this._indentLevel++;
                    for (var i = 0; i < ast.caseStmts.length; i++) {
                        var c = ast.caseStmts[i];
                        if (c.item) this._writeIndents()._write("case ")._visitRaw(c.item)._writeLine(":");
                        else this._writeIndents()._writeLine("default:");
                        this._indentLevel++;
                        this._visitJscexStatements(c.stmts);
                        this._indentLevel--;
                    }
                    this._writeIndents()._write("}");
                },
                "try": function (ast) {
                    this._writeLine(this._builderVar + ".Try(");
                    this._indentLevel++;
                    this._writeIndents()._visitJscex(ast.bodyStmt)._writeLine(",");
                    if (ast.catchStmts) {
                        this._writeIndents()._writeLine("function (" + ast.exVar + ") {");
                        this._indentLevel++;
                        this._visitJscexStatements(ast.catchStmts);
                        this._indentLevel--;
                        this._writeIndents()._writeLine("},");
                    } else { this._writeIndents()._writeLine("null,"); }
                    if (ast.finallyStmt) this._writeIndents()._visitJscex(ast.finallyStmt)._writeLine();
                    else this._writeIndents()._writeLine("null");
                    this._indentLevel--;
                    this._writeIndents()._write(")");
                },
                "normal": function (ast) { this._write(this._builderVar + ".Normal()"); },
                "throw": function (ast) { this._write(this._builderVar + ".Throw(")._visitRaw(ast.stmt[1])._write(")"); },
                "break": function (ast) { this._write(this._builderVar + ".Break()"); },
                "continue": function (ast) { this._write(this._builderVar + ".Continue()"); },
                "return": function (ast) { this._write(this._builderVar + ".Return("); if (ast.stmt[1]) this._visitRaw(ast.stmt[1]); this._write(")"); }
            },
            _rawVisitors: {
                "var": function (ast) {
                    this._write("var ");
                    var items = ast[1];
                    for (var i = 0; i < items.length; i++) {
                        this._write(items[i][0]);
                        if (items[i].length > 1) this._write(" = ")._visitRaw(items[i][1]);
                        if (i < items.length - 1) this._write(", ");
                    }
                    this._write(";");
                },
                "seq": function (ast) { for (var i = 1; i < ast.length; i++) { this._visitRaw(ast[i]); if (i < ast.length - 1) this._write(", "); } },
                "binary": function (ast) {
                    var op = ast[1], left = ast[2], right = ast[3];
                    function needBracket(item) { var t = item[0]; return !(t == "num" || t == "name" || t == "dot"); }
                    if (needBracket(left)) this._write("(")._visitRaw(left)._write(") "); else this._visitRaw(left)._write(" ");
                    this._write(op);
                    if (needBracket(right)) this._write(" (")._visitRaw(right)._write(")"); else this._write(" ")._visitRaw(right);
                },
                "sub": function (ast) {
                    if (ast[1][0] != "name") this._write("(")._visitRaw(ast[1])._write(")[")._visitRaw(ast[2])._write("]");
                    else this._visitRaw(ast[1])._write("[")._visitRaw(ast[2])._write("]");
                },
                "unary-postfix": function (ast) { this._visitRaw(ast[2])._write(ast[1]); },
                "unary-prefix": function (ast) {
                    this._write(ast[1]);
                    if (ast[1] == "typeof") this._write("(")._visitRaw(ast[2])._write(")");
                    else this._visitRaw(ast[2]);
                },
                "assign": function (ast) {
                    this._visitRaw(ast[2]);
                    if (typeof ast[1] == "string") this._write(" " + ast[1] + "= ");
                    else this._write(" = ");
                    this._visitRaw(ast[3]);
                },
                "stat": function (ast) { this._visitRaw(ast[1])._write(";"); },
                "dot": function (ast) {
                    var leftOp = ast[1][0];
                    if (leftOp != "dot" && leftOp != "name") this._write("(")._visitRaw(ast[1])._write(")." + ast[2]);
                    else this._visitRaw(ast[1])._write("." + ast[2]);
                },
                "new": function (ast) {
                    this._write("new ")._visitRaw(ast[1])._write("(");
                    for (var i = 0; i < ast[2].length; i++) { this._visitRaw(ast[2][i]); if (i < ast[2].length - 1) this._write(", "); }
                    this._write(")");
                },
                "call": function (ast) {
                    if (_isJscexPattern(ast)) {
                        this._write(_compileJscexPattern(ast, this._indent + this._indentLevel * 4));
                    } else {
                        var invalidBind = (ast[1][0] == "name") && (ast[1][1] == this._binder);
                        if (invalidBind) { this._pos = { inFunction: true }; this._buffer = []; }
                        this._visitRaw(ast[1])._write("(");
                        for (var i = 0; i < ast[2].length; i++) { this._visitRaw(ast[2][i]); if (i < ast[2].length - 1) this._write(", "); }
                        this._write(")");
                        if (invalidBind) throw ("Invalid bind operation: " + this._buffer.join(""));
                    }
                },
                "name": function (ast) { this._write(ast[1]); },
                "object": function (ast) {
                    var items = ast[1];
                    if (items.length <= 0) { this._write("{ }"); return; }
                    this._writeLine("{"); this._indentLevel++;
                    for (var i = 0; i < items.length; i++) {
                        this._writeIndents()._write(stringify(items[i][0]) + ": ")._visitRaw(items[i][1]);
                        if (i < items.length - 1) this._writeLine(","); else this._writeLine("");
                    }
                    this._indentLevel--; this._writeIndents()._write("}");
                },
                "array": function (ast) {
                    this._write("[");
                    for (var i = 0; i < ast[1].length; i++) { this._visitRaw(ast[1][i]); if (i < ast[1].length - 1) this._write(", "); }
                    this._write("]");
                },
                "num": function (ast) { this._write(ast[1]); },
                "regexp": function (ast) { this._write("/" + ast[1] + "/" + ast[2]); },
                "string": function (ast) { this._write(stringify(ast[1])); },
                "function": function (ast) { this._visitRawFunction(ast); },
                "defun": function (ast) { this._visitRawFunction(ast); },
                "return": function (ast) {
                    if (this._pos.inFunction) { this._write("return"); if (ast[1]) this._write(" ")._visitRaw(ast[1]); this._write(";"); }
                    else { this._write("return ")._visitJscex({ type: "return", stmt: ast })._write(";"); }
                },
                "for": function (ast) {
                    this._write("for (");
                    if (ast[1]) { this._visitRaw(ast[1]); this._write(ast[1][0] != "var" ? "; " : " "); } else { this._write("; "); }
                    if (ast[2]) this._visitRaw(ast[2]);
                    this._write("; ");
                    if (ast[3]) this._visitRaw(ast[3]);
                    this._write(") ");
                    var currInLoop = this._pos.inLoop; this._pos.inLoop = true;
                    this._visitRawBody(ast[4]);
                    this._pos.inLoop = currInLoop;
                },
                "for-in": function (ast) {
                    this._write("for (");
                    if (ast[1][0] == "var") this._write("var " + ast[1][1][0][0]); else this._visitRaw(ast[1]);
                    this._write(" in ")._visitRaw(ast[3])._write(") ");
                    this._visitRawBody(ast[4]);
                },
                "block": function (ast) {
                    this._writeLine("{"); this._indentLevel++;
                    this._visitRawStatements(ast[1]);
                    this._indentLevel--; this._writeIndents()._write("}");
                },
                "while": function (ast) {
                    var curr = this._pos.inLoop; this._pos.inLoop = true;
                    this._write("while (")._visitRaw(ast[1])._write(") ")._visitRawBody(ast[2]);
                    this._pos.inLoop = curr;
                },
                "do": function (ast) {
                    var curr = this._pos.inLoop; this._pos.inLoop = true;
                    this._write("do ")._visitRawBody(ast[2]);
                    this._pos.inLoop = curr;
                    if (ast[2][0] == "block") this._write(" "); else this._writeLine()._writeIndents();
                    this._write("while (")._visitRaw(ast[1])._write(");");
                },
                "if": function (ast) {
                    this._write("if (")._visitRaw(ast[1])._write(") ")._visitRawBody(ast[2]);
                    if (ast[3]) {
                        if (ast[2][0] == "block") this._write(" "); else this._writeLine("")._writeIndents();
                        if (ast[3][0] == "if") this._write("else ")._visitRaw(ast[3]);
                        else this._write("else ")._visitRawBody(ast[3]);
                    }
                },
                "break": function (ast) {
                    if (this._pos.inLoop || this._pos.inSwitch) this._write("break;");
                    else this._write("return ")._visitJscex({ type: "break", stmt: ast })._write(";");
                },
                "continue": function (ast) {
                    if (this._pos.inLoop) this._write("continue;");
                    else this._write("return ")._visitJscex({ type: "continue", stmt: ast })._write(";");
                },
                "throw": function (ast) {
                    if (this._pos.inTry || this._pos.inFunction) this._write("throw ")._visitRaw(ast[1])._write(";");
                    else this._write("return ")._visitJscex({ type: "throw", stmt: ast })._write(";");
                },
                "conditional": function (ast) { this._write("(")._visitRaw(ast[1])._write(") ? (")._visitRaw(ast[2])._write(") : (")._visitRaw(ast[3])._write(")"); },
                "try": function (ast) {
                    this._writeLine("try {"); this._indentLevel++;
                    var curr = this._pos.inTry; this._pos.inTry = true;
                    this._visitRawStatements(ast[1]);
                    this._indentLevel--; this._pos.inTry = curr;
                    if (ast[2]) { this._writeIndents()._writeLine("} catch (" + ast[2][0] + ") {"); this._indentLevel++; this._visitRawStatements(ast[2][1]); this._indentLevel--; }
                    if (ast[3]) { this._writeIndents()._writeLine("} finally {"); this._indentLevel++; this._visitRawStatements(ast[3]); this._indentLevel--; }
                    this._writeIndents()._write("}");
                },
                "switch": function (ast) {
                    this._write("switch (")._visitRaw(ast[1])._writeLine(") {"); this._indentLevel++;
                    var curr = this._pos.inSwitch; this._pos.inSwitch = true;
                    for (var i = 0; i < ast[2].length; i++) {
                        var c = ast[2][i]; this._writeIndents();
                        if (c[0]) this._write("case ")._visitRaw(c[0])._writeLine(":"); else this._writeLine("default:");
                        this._indentLevel++; this._visitRawStatements(c[1]); this._indentLevel--;
                    }
                    this._indentLevel--; this._pos.inSwitch = curr; this._writeIndents()._write("}");
                }
            }
        };

        function _isJscexPattern(ast) {
            if (ast[0] != "call") return false;
            var evalName = ast[1];
            if (evalName[0] != "name" || evalName[1] != "eval") return false;
            var compileCall = ast[2][0];
            if (!compileCall || compileCall[0] != "call") return false;
            var compileMethod = compileCall[1];
            if (!compileMethod || compileMethod[0] != "dot" || compileMethod[2] != "compile") return false;
            var jscexName = compileMethod[1];
            if (!jscexName || jscexName[0] != "name" || jscexName[1] != "Jscex") return false;
            var builder = compileCall[2][0];
            if (!builder || builder[0] != "string") return false;
            var func = compileCall[2][1];
            if (!func || func[0] != "function") return false;
            return true;
        }
        
        function _compileJscexPattern(ast, indent) {
            var builderName = ast[2][0][2][0][1];
            var funcAst = ast[2][0][2][1];
            var binder = root.binders[builderName];
            var jscexTreeGenerator = new JscexTreeGenerator(binder);
            var jscexAst = jscexTreeGenerator.generate(funcAst);
            var gen = new CodeGenerator(builderName, binder, indent);
            return gen.generate(funcAst[2], jscexAst);
        }
        
        function compile(builderName, func) {
            var funcCode = func.toString();
            var evalCode = "eval(Jscex.compile(" + stringify(builderName) + ", " + funcCode + "))";
            var evalCodeAst = root.parse(evalCode);
            var evalAst = evalCodeAst[1][0][1];
            var newCode = _compileJscexPattern(evalAst, 0);
            root.logger.debug(funcCode + "\n\n>>>\n\n" + newCode);
            return codeGenerator(newCode);
        }

        root.compile = compile;
        root.modules["jit"] = true;
    };
    
    var isCommonJS = (typeof require !== "undefined" && typeof module !== "undefined" && module.exports);
    var isAmd = (typeof define !== "undefined" && define.amd);
    
    if (isCommonJS) {
        module.exports.init = function (root) {
            if (!root.modules["parser"]) require("./jscex-parser").init(root);
            init(root);
        };
    } else if (isAmd) {
        define("jscex-jit", ["jscex-parser"], function (parser) {
            return { init: function (root) { if (!root.modules["parser"]) parser.init(root); init(root); } };
        });
    } else {
        if (typeof Jscex === "undefined") throw new Error('Missing root object, please load "jscex" module first.');
        if (!Jscex.modules["parser"]) throw new Error('Missing essential components, please initialize "parser" module first.');
        init(Jscex);
    }
})();
