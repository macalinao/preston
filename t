[1mdiff --git a/lib/model.js b/lib/model.js[m
[1mindex 055e115..d04d92b 100644[m
[1m--- a/lib/model.js[m
[1m+++ b/lib/model.js[m
[36m@@ -36,9 +36,9 @@[m [mfunction Model(restifier, model) {[m
  * @param field - The field to constrain[m
  * @paran fn(req, num) - The constraint function.[m
  */[m
[31m-Model.prototype.constrain = function(field, fn) {[m
[32m+[m[32mModel.prototype.constrain = function(param, fn) {[m
   this.constraints.push({[m
[31m-    field: field,[m
[32m+[m[32m    param: param,[m
     fn: fn[m
   });[m
   return this;[m
