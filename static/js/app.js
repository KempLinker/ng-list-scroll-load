var demoApp = angular.module('demo', [
    'KL.ngListScrollLoad'
]);
demoApp.controller('mainCtrl', ['$scope', '$http',
    function ($scope, $http) {
       
        $scope.getList = function(){
            $http.post(
                './static/src/jsonData.json'
            ).then(function (data) {
                var list =  data.data.result;
                for( var i = 0; i < 10; i ++ ){
                    list = list.concat(list);
                }
                $scope.apiList = list;
               
            });
        };
        $scope.getList();

        $scope.changeTarget = function(val){
            $scope.targetPos = val;
        };

}]);
