
angular.module('KL.ngListScrollLoad', []).directive('ngListScrollLoad', ngListScrollLoadDirective);

ngListScrollLoadDirective.$inject = ['$timeout'];

function ngListScrollLoadDirective($timeout) {
    return {
        require: '?ngModel',
        scope: {
            ngModel: '=',
            viewportItems: '=',
            bufferAmount: '=',
            stepAmount: '=',
            targetPos: '=',
            loadAnimation: '='
        },
        link: function(scope, element, attrs, ngModel) {

            function scrollComponent(){
                var _this = this;
                this.window = window;
                this.bufferAmount = 0;
                this.stepAmount = 0;
                this.scrollLoop  = true;
                this.start = 0;
                this.end = this.start + this.stepAmount;
                this.wholeItems = []; // 全部数据
                this.viewportItems = []; // 视图展示数据
                this.childDomHeight = 0; // 视图展示数据
                this.initAmount = 200;
                this.isScrollLoop = false;
                this.isScrollUp = false;
                this.isScrollDown = false;
                this.isScrollSkip = false;
                this.prevScrollVal = 0;
                this.intervalFunc = null;
                this.loadAnimation = false;
                this.isScrollLoading = false;
                this.setTimeoutFunc = null;
                this.refreshEvent = function () {
                    _this.refresh();
                };
            }

            Object.defineProperty(scrollComponent.prototype, "eleScroll", {
                get: function () {
                    return this._eleScroll;
                },
                set: function (element) {
                    if ( this._eleScroll === element ) {
                        return false;
                    }
                    this.unbindScrollEvents(this._eleScroll);
                    this._eleScroll = element;
                    this.bindScrollEvents(this._eleScroll);
                }
            });

            scrollComponent.prototype.initModule = function (element, scopeData) {
                this.eleScroll = element;
                this.wholeItems = scopeData.ngModel;
                this.loadAnimation = scopeData.loadAnimation;
                this.viewportItems = scopeData.viewportItems;
                this.bufferAmount = scopeData.bufferAmount;
                this.stepAmount = scopeData.stepAmount;
                this.end = this.start + this.initAmount;
                this.initDefaultModule();
                if( this.loadAnimation ) {
                    this.initLoadingDom();
                }
                this.handleScrollEvents( this.eleScroll );

            };

            scrollComponent.prototype.destroyModule = function () {
                this.unbindScrollEvents(this.eleScroll);
                clearTimeout(this.setTimeoutFunc);
                clearInterval(this.intervalFunc);
            };

            scrollComponent.prototype.initDefaultModule = function(){
                var start = this.start;
                var end = this.end;
                this.viewportItems = this.wholeItems.slice(start, end);
                scope.viewportItems = this.viewportItems;
            };

            scrollComponent.prototype.handleScrollEvents = function ( element ) {
                if ( this.eleScroll === element ) {
                    return false;
                }
                this.unbindScrollEvents( element );
                this.eleScroll = element;
                this.bindScrollEvents( element );
            };

            scrollComponent.prototype.bindScrollEvents = function ( eleScroll ) {
                if ( eleScroll ) {
                    eleScroll.addEventListener('scroll', this.refreshEvent);
                    if ( eleScroll instanceof Window ) {
                        eleScroll.addEventListener('resize', this.refreshEvent);
                    }
                }
            };

            scrollComponent.prototype.unbindScrollEvents = function (eleScroll) {
                if ( eleScroll ) {
                    eleScroll.removeEventListener('scroll', this.refreshEvent);

                    if ( eleScroll instanceof Window ) {
                        eleScroll.removeEventListener('resize', this.refreshEvent);
                    }
                }
            };

            scrollComponent.prototype.scrollToTarget = function( index ){
                var _this = this;
                var stepAmount = this.stepAmount;
                var bufferAmount = this.bufferAmount;
                this.scrollLoop = false;
                if( index === '' ){
                    return false;
                }
                index = parseInt(index);
                var newStart = index - bufferAmount;
                var newEnd = newStart + stepAmount;
                _this.reloadItems(newStart, newEnd);

            };

            scrollComponent.prototype.calcItems = function () {

                var wholeItems = this.wholeItems;
                var bufferAmount = this.bufferAmount;
                var baseSizeData = this.getBaseSizeData();
                var viewHeight = baseSizeData.viewHeight;
                var childHeight = baseSizeData.childHeight;
                var scrollHeight = baseSizeData.scrollHeight;
                var scrollTop = baseSizeData.scrollTop;
                var start = this.start;
                var end = this.end;
                var increaseNum = 0;

                if( !!this.isScrollDown && end < wholeItems.length ){
                    if( (scrollHeight- scrollTop - viewHeight) <= childHeight * bufferAmount ){
                        increaseNum = bufferAmount;
                        this.reloadItems(start + increaseNum, end + increaseNum, 'down');
                    }
                }

                if( !!this.isScrollUp && start > 0 ){
                    if( scrollTop <= childHeight * bufferAmount ){
                        increaseNum = -bufferAmount;
                        this.reloadItems(start + increaseNum, end + increaseNum, 'up');
                    }
                }
                if( this.isScrollLoop === true ){
                    this.isScrollLoop = false;
                }
            };

            scrollComponent.prototype.reCalcScrollTop = function(){
                var _this = this;
                var bufferAmount = this.bufferAmount;
                var childHeight = this.childDomHeight;
                childHeight = childHeight ? childHeight : this.getBaseSizeData().childHeight;
                var scrollTop = this.getScrollTop();
                var start = this.start;
                if( scrollTop == 0 && start != 0 ){
                    _this.setScrollTop( childHeight * (bufferAmount + 1), true );
                }
            };

            scrollComponent.prototype.reloadItems = function(newStart, newEnd, direction){

                var _this = this;
                var stepAmount = this.stepAmount;
                var bufferAmount = this.bufferAmount;
                var wholeItems = this.wholeItems;
                var wholeLength = this.wholeItems.length;
                if( this.isScrollLoading ){
                    return false;
                }
                newStart = Math.max(newStart, 0);
                newStart = Math.min(newStart, wholeLength-1-stepAmount);
                newEnd = Math.max(newEnd, 0);
                newEnd = Math.min(newEnd, wholeLength-1);
                var diffNum = Math.abs(newEnd - newStart);

                if( direction == 'down' && diffNum < stepAmount ){
                    newStart = newEnd - stepAmount
                }
                if( direction == 'top' && diffNum < stepAmount ){
                    newEnd = newStart + stepAmount
                }
                if( direction == 'down' && diffNum >= stepAmount && diffNum < stepAmount * 1.5 ){
                    newStart -= bufferAmount;
                    newStart = Math.max(newStart, 0);
                }
                var newItems = wholeItems.slice(newStart, newEnd);
                this.start = newStart;
                this.end = newEnd;
                if( this.loadAnimation ){
                    _this.toggleLoadingAnim();
                    clearTimeout(this.setTimeoutFunc);
                    this.setTimeoutFunc = setTimeout(function(){
                        _this.emitViewport(newItems);
                    }, 1000)
                } else{
                    this.emitViewport(newItems);
                }
            };

            scrollComponent.prototype.refresh = function () {

                var _this = this;
                if( !this.scrollLoop ){
                    this.scrollLoop = true;
                    return false;
                }
                var scrollVal = this.getScrollTop();
                if( scrollVal < this.prevScrollVal ){
                    this.isScrollUp = true;
                    this.isScrollDown = false;

                } else {
                    this.isScrollUp = false;
                    this.isScrollDown = true;
                }
                this.prevScrollVal = scrollVal;
                this.isScrollLoop = true;

                clearInterval(this.intervalFunc);
                this.intervalFunc = setInterval(function(){
                    if( _this.getScrollTop() == 0 ) {
                        clearInterval(_this.intervalFunc);
                        _this.intervalFunc = null;
                        if( !_this.isScrollLoop ){
                            _this.calcItems();
                            _this.reCalcScrollTop();
                        }
                    }
                }, 50);
                return requestAnimationFrame(function () {
                    return _this.calcItems();
                });

            };

            scrollComponent.prototype.emitViewport = function(list){
                var _this = this;
                scope.viewportItems = list;
                this.isScrollLoop = false;
                $timeout(function(){
                    if( _this.isScrollSkip ){
                        _this.reCalcScrollTop();
                        _this.isScrollSkip = false;
                    }
                    if( _this.loadAnimation ){
                        _this.toggleLoadingAnim();
                    }
                    showHtml()
                });
            };

            scrollComponent.prototype.getScrollHeight = function(){
                var element = this.getScrollEle();
                return ( element instanceof Window ) ? document.body.scrollHeight : element.scrollHeight;
            };

            scrollComponent.prototype.getScrollTop = function(){
                var element = this.getScrollEle();
                return ( this.eleScroll instanceof Window )
                    ? (window.pageYOffset || document.documentElement.scrollTop || document.body.scrollTop || 0)
                    : element.scrollTop;
            };

            scrollComponent.prototype.setScrollTop = function(val, needAnimation){
                var _this = this;
                var element = this.getScrollEle();
                element.scrollTop = val;
                if( needAnimation ){
                    element.animate({
                        'scrollTop': val
                    },function(){
                        _this.scrollLoop = true;
                    })

                } else{
                    element.scrollTop = val;
                }
            };

            scrollComponent.prototype.getScrollEle = function(){
                return ( this.eleScroll instanceof Window ) ? document.body : this.eleScroll || this.eleScroll.nativeElement;
            };


            scrollComponent.prototype.getScrollChildOffset = function( parent ){
                var index = 0;
                if( parent.children && parent.children.length > 0 ){
                    if( parent.children[0].className.indexOf('J-scroll-loading-top') >= 0 ){
                        index ++;
                    }
                    return parent.children[index].getBoundingClientRect();
                } else{
                    return {
                        width: parent.clientWidth,
                        height: parent.clientHeight
                    }
                }
            };


            scrollComponent.prototype.getBaseSizeData = function (){
                var element = this.getScrollEle();
                var scrollHeight = this.getScrollHeight();
                var scrollTop = this.getScrollTop();
                var items = this.wholeItems || [];
                var itemCount = items.length;
                var viewWidth = element.clientWidth;
                var viewHeight = element.clientHeight;
                var childOffsetSize = this.getScrollChildOffset(element);
                var childWidth = childOffsetSize.width;
                var childHeight = this.childDomHeight = childOffsetSize.height;
                var childLen = element.children.length;
                var tombstoneBeforeDom = document.getElementById('J-scroll-tombstone-before');
                var tombstoneAfterDom = document.getElementById('J-scroll-tombstone-after');
                childLen = !!tombstoneBeforeDom ? --childLen : childLen;
                childLen = !!tombstoneAfterDom ? --childLen : childLen;
                return {
                    itemCount: itemCount,
                    viewWidth: viewWidth,
                    viewHeight: viewHeight,
                    childWidth: childWidth,
                    childHeight: childHeight,
                    childLen: childLen,
                    scrollHeight: scrollHeight,
                    scrollTop: scrollTop
                };
            };

            scrollComponent.prototype.toggleLoadingAnim = function (){
                var element = this.getScrollEle();
                var bufferAmount = this.bufferAmount;
                var childHeight = this.childDomHeight;
                var scrollTop = this.getScrollTop();
                var $topLoadingDom = $(element).find('.J-scroll-loading-top');
                var $bottomLoadingDom = $(element).find('.J-scroll-loading-bottom');
                var $loadingDom = this.isScrollDown ? $bottomLoadingDom : $topLoadingDom;
                if( !this.isScrollLoading ){
                    $loadingDom.show();
                    this.isScrollLoading = true;

                } else{
                    $timeout(function() {
                        $topLoadingDom.hide();
                        $bottomLoadingDom.hide();
                        $topLoadingDom.remove();
                        $topLoadingDom.insertBefore($(element).find('li:eq(0)'));
                    },0);
                    if( this.isScrollUp ){
                        this.setScrollTop( scrollTop + (++bufferAmount) * childHeight );
                    }
                    if( this.isScrollDown ){
                        this.setScrollTop( scrollTop - (++bufferAmount) * childHeight );
                    }
                    this.isScrollLoading = false;
                }
            };


            scrollComponent.prototype.initLoadingDom = function (){
                var element = this.getScrollEle();
                var templateDomHtml = '<div class="list-scroll-load-ani">'
                                + '<div class="loader-outer">'
                                + '<div class="loader-inner line-scale-pulse-out-rapid" >'
                                + '<div></div><div></div><div></div><div></div><div></div>'
                                + '</div>'
                                + '</div>'
                                + '</div>';
                var $topLoadingDom = $(templateDomHtml).addClass('J-scroll-loading-top top');
                var $bottomLoadingDom = $(templateDomHtml).addClass('J-scroll-loading-bottom bottom');
                $timeout(function() {
                    $(element).append($bottomLoadingDom);
                    $topLoadingDom.insertBefore($(element).find('li:eq(0)'));
                });

            };


            function showHtml(){
                var _this = scrollModule;
                document.getElementById('show').innerHTML = 'total: '+_this.wholeItems.length+' start: '+_this.start+' end: '+_this.end+' diff: '+(_this.end-_this.start);
            }


            var scrollModule = {};
            if (ngModel) {
                var unWatch = scope.$watch('ngModel.length', function(newValue, oldValue) {
                    if ( !!newValue && newValue !== oldValue ) {
                        scrollModule = new scrollComponent();
                        scrollModule.initModule(element[0], scope);

                        unWatch();
                    }
                });

            } else {
                console.log('ngLazyScrollLoad: ngModel not provided!', element);
            }

            scope.$on('$destroy', function() {
                scrollModule.destroyModule();
            });

            scope.$watch('targetPos', function(newVal, oldVal){
                if( newVal != undefined && newVal != oldVal ) {
                    scrollModule.scrollToTarget(newVal);
                    scrollModule.isScrollSkip = true;
                }
            });

            window.requestAnimFrame = (function(){
                return  window.requestAnimationFrame   ||
                    window.webkitRequestAnimationFrame ||
                    window.mozRequestAnimationFrame    ||
                    window.oRequestAnimationFrame      ||
                    window.msRequestAnimationFrame     ||
                    function( callback ){
                        window.setTimeout(callback, 1000 / 60);
                    };
            })();
        }
    };
}
