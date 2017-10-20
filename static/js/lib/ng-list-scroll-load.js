
/*
 * ngListScrollLoad v0.0.1
 * https://github.com/KempLinker/ng-list-scroll-load
 * Copyright (c) 2017 ; Licensed MIT
 *
 * An angular component of list with a large number of data.
 * To resolve the performance of web pages, the default amount of items are loaded while the list initialized.
 * While the list scrolling, new items will be appended to the bottom of the list, and the top items will be removed at the same time.
 * Only the fixed number of item can be rendered in the visible area.
 * In addition, we can broadcast to located an expected position.
 *
 *
 */
(function() {
    'use strict';

    angular.module('KL.ngListScrollLoad', []).directive('ngListScrollLoad', ngListScrollLoadDirective);

    ngListScrollLoadDirective.$inject = ['$timeout','$log'];

    function ngListScrollLoadDirective($timeout) {
        return {
            require: '?ngModel',
            scope: {
                ngModel: '=', //初始化全部数据
                viewportItems: '=', //返回页面渲染数据
                initAmount: '=', //每页显示数据量
                stepAmount: '=', //滚动增加数据步长
                bufferAmount: '=', //触发滚动阈值
                loadAnimation: '=', //是否使用动画,动画时长
                resizeReset: '=', //改变窗口尺寸重新渲染
                targetPos: '=' //期望定位
            },
            link: function(scope, element, attrs, ngModel) {

                function scrollComponent(){
                    var _this = this;
                    this.window = window;
                    this.wholeItems = [];
                    this.viewportItems = [];
                    this.initAmount = 0;
                    this.stepAmount = 0;
                    this.bufferAmount = 0;
                    this.loadAnimation = false;
                    this.animationTime = 0;
                    this.start = 0; //起始位置
                    this.end = this.start + this.initAmount; //终止位置
                    this.isScrollLoop = false; //是否正在滚动
                    this.isScrollUp = false; //是否向上滚动
                    this.isScrollDown = false; //是否向下滚动
                    this.isScrollSkip = false; //是否跳转滚动
                    this.isScrollLoading = false; //是否正在加载
                    this.prevScrollVal = 0; //上一次滚动值
                    this.childDomHeight = 0; //列表子元素高度
                    this.setTimeoutFunc = null; //延时函数
                    this.intervalFunc = null; //计时函数
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

                /**
                 * 实例模型初始化
                 * @param element
                 * @param scopeData
                 */
                scrollComponent.prototype.initModule = function (element, scopeData) {
                    this.eleScroll = element;
                    this.wholeItems = scopeData.ngModel;
                    this.loadAnimation = scopeData.loadAnimation;
                    this.animationTime = this.loadAnimation ? Number(this.loadAnimation) : 0;
                    this.viewportItems = scopeData.viewportItems;
                    this.initAmount = scopeData.initAmount;
                    this.stepAmount = scopeData.stepAmount;
                    this.bufferAmount = scopeData.bufferAmount;
                    this.end = this.start + this.initAmount;
                    this.initDefaultModule();
                    if( this.loadAnimation ) {
                        this.initLoadingDom();
                    }

                };

                /**
                 * 销毁当前实例
                 * 销毁绑定事件
                 */
                scrollComponent.prototype.destroyModule = function () {
                    this.unbindScrollEvents(this.eleScroll);
                    clearTimeout(this.setTimeoutFunc);
                    clearInterval(this.intervalFunc);
                };

                /**
                 * 初始化第一次渲染的数据
                 * 绑定滚动事件
                 */
                scrollComponent.prototype.initDefaultModule = function(){
                    var start = this.start;
                    var end = this.end;
                    this.viewportItems = this.wholeItems.slice(start, end);
                    scope.viewportItems = this.viewportItems;
                    this.handleScrollEvents( this.eleScroll );
                };

                /**
                 * 处理事件绑定和解绑
                 * @param element 滚动元素
                 * @returns {boolean}
                 */
                scrollComponent.prototype.handleScrollEvents = function ( element ) {
                    if ( this.eleScroll === element ) {
                        return false;
                    }
                    this.unbindScrollEvents( element );
                    this.eleScroll = element;
                    this.bindScrollEvents( element );
                };


                /**
                 * 绑定事件
                 * @param eleScroll 滚动元素
                 */
                scrollComponent.prototype.bindScrollEvents = function ( eleScroll ) {
                    if ( eleScroll ) {
                        eleScroll.addEventListener('scroll', this.refreshEvent);
                        if ( eleScroll instanceof Window ) {
                            eleScroll.addEventListener('resize', this.refreshEvent);
                        }
                    }
                };

                /**
                 * 解绑事件
                 * @param eleScroll 滚动元素
                 */
                scrollComponent.prototype.unbindScrollEvents = function (eleScroll) {
                    if ( eleScroll ) {
                        eleScroll.removeEventListener('scroll', this.refreshEvent);

                        if ( eleScroll instanceof Window ) {
                            eleScroll.removeEventListener('resize', this.refreshEvent);
                        }
                    }
                };

                /**
                 * 初始化动画节点
                 */
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
                    },0);

                };

                /**
                 * 获取当前滚动元素
                 * @returns {HTMLElement}
                 */
                scrollComponent.prototype.getScrollEle = function(){
                    return ( this.eleScroll instanceof Window ) ? document.body : this.eleScroll || this.eleScroll.nativeElement;
                };


                /**
                 * 是否滚动条处于顶部
                 * @returns {boolean}
                 */
                scrollComponent.prototype.isScrollTop = function(){
                    var scrollTop = this.getScrollTop();
                    return scrollTop == 0

                };

                /**
                 * 是否滚动条处于底部
                 * @returns {boolean}
                 */
                scrollComponent.prototype.isScrollBottom = function(){
                    var element = this.getScrollEle();
                    var viewHeight = element.clientHeight;
                    var scrollTop = this.getScrollTop();
                    var scrollHeight = this.getScrollHeight();
                    return (scrollHeight- scrollTop - viewHeight) == 0

                };

                /**
                 * 获取滚动条滚动距离
                 * @returns {number}
                 */
                scrollComponent.prototype.getScrollTop = function(){
                    var element = this.getScrollEle();
                    return ( this.eleScroll instanceof Window )
                        ? (window.pageYOffset || document.documentElement.scrollTop || document.body.scrollTop || 0)
                        : element.scrollTop;
                };

                /**
                 * 设置滚动条滚动距离
                 * @returns {number}
                 */
                scrollComponent.prototype.setScrollTop = function(val, needAnimation){
                    var _this = this;
                    var element = this.getScrollEle();
                    element.scrollTop = val;
                    if( needAnimation ){
                        element.animate({
                            'scrollTop': val
                        },function(){
                            _this.isScrollLoop = false;
                        })

                    } else{
                        element.scrollTop = val;
                        this.isScrollLoop = false;
                    }
                };

                /**
                 * 获取滚动区域高度
                 * @returns {number}
                 */
                scrollComponent.prototype.getScrollHeight = function(){
                    var element = this.getScrollEle();
                    return ( element instanceof Window ) ? document.body.scrollHeight : element.scrollHeight;
                };

                /**
                 * 获取滚动列表元素的尺寸位置
                 * @returns {number}
                 */
                scrollComponent.prototype.getScrollChildOffset = function( parent ){
                    var index = 0;
                    if( parent.children && parent.children.length > 0 ){
                        // 使用动画时，第一个子元素是加载节点，真实节点后移
                        if( this.loadAnimation && parent.children[0].className.indexOf('J-scroll-loading-top') >= 0 ){
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

                /**
                 * 获取页面基础尺寸信息
                 * @returns {{itemCount: Number, viewWidth: number, viewHeight: number, childWidth, childHeight: *, childLen: Number, scrollHeight: number, scrollTop: number}}
                 */
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
                        itemCount: itemCount, //滚动列表元素数量
                        viewWidth: viewWidth, //视图宽度
                        viewHeight: viewHeight, //视图高度
                        childWidth: childWidth, //子元素宽度
                        childHeight: childHeight, //子元素高度
                        childLen: childLen, //子元素数量
                        scrollHeight: scrollHeight, //滚动区域高度
                        scrollTop: scrollTop //滚动距离
                    };
                };


                /**
                 * 定位到到目标位置
                 * @param index
                 * @returns {boolean}
                 */
                scrollComponent.prototype.scrollToTarget = function( index ){
                    var _this = this;
                    var initAmount = this.initAmount;
                    var bufferAmount = this.bufferAmount;
                    this.isScrollLoop = false;
                    if( index === '' ){
                        return false;
                    }
                    index = parseInt(index);
                    var newStart = index - bufferAmount + 1; //上方预留缓存数量的距离
                    var newEnd = newStart + initAmount;
                    _this.reloadItems(newStart, newEnd);
                };

                /**
                 * 重新处理滚动条距顶部距离，预留阈值数量高度
                 */
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

                /**
                 * 重新处理滚动条距底部距离，预留阈值数量高度
                 */
                scrollComponent.prototype.reCalcScrollBottom = function(){
                    var stepAmount = this.stepAmount;
                    var childHeight = this.childDomHeight;
                    childHeight = childHeight ? childHeight : this.getBaseSizeData().childHeight;
                    var scrollTop = this.getScrollTop();
                    this.setScrollTop( scrollTop - childHeight * stepAmount, true );
                };

                /**
                 * 计算需要加载的数据
                 * @returns {boolean}
                 */
                scrollComponent.prototype.calcItems = function () {

                    var wholeItems = this.wholeItems;
                    var bufferAmount = this.bufferAmount;
                    var stepAmount = this.stepAmount;
                    var baseSizeData = this.getBaseSizeData();
                    var viewHeight = baseSizeData.viewHeight;
                    var childHeight = baseSizeData.childHeight;
                    var scrollHeight = baseSizeData.scrollHeight;
                    var scrollTop = baseSizeData.scrollTop;
                    var start = this.start;
                    var end = this.end;

                    // 正在滚动不计算
                    if( !this.isScrollLoop ){
                        return false;
                    }

                    var increaseNum = stepAmount;
                    // 向下滚动
                    if( !!this.isScrollDown && end < wholeItems.length ){
                        // 剩余的滚动距离达到阈值高度
                        if( (scrollHeight- scrollTop - viewHeight) <= childHeight * bufferAmount ){
                            this.reloadItems(start + increaseNum, end + increaseNum, 'down');
                        }
                    }
                    // 向上滚动
                    if( !!this.isScrollUp && start > 0 ){
                        // 剩余的滚动距离达到阈值高度
                        if( scrollTop <= childHeight * bufferAmount ){
                            this.reloadItems(start - increaseNum, end - increaseNum, 'up');
                        }
                    }
                    // 重置正在滚动标识
                    if( this.isScrollLoop === true ){
                        this.isScrollLoop = false;
                    }
                };

                /**
                 * 执行加载数据
                 * @param newStart
                 * @param newEnd
                 * @param direction
                 * @returns {boolean}
                 */
                scrollComponent.prototype.reloadItems = function(newStart, newEnd, direction){

                    // 使用动画，并且加载中时，不执行
                    if( this.loadAnimation && this.isScrollLoading ){
                        return false;
                    }
                    var _this = this;
                    var initAmount = this.initAmount;
                    var stepAmount = this.stepAmount;
                    var wholeItems = this.wholeItems;
                    var wholeLength = this.wholeItems.length;
                    var animationTime = this.animationTime;

                    // 保证新的首尾位置有效，不越界
                    newStart = Math.max(newStart, 0);
                    newStart = Math.min(newStart, wholeLength - 1- initAmount);
                    newEnd = Math.max(newEnd, 0);
                    newEnd = Math.min(newEnd, wholeLength - 1);

                    // 新加载的数量
                    var diffNum = Math.abs(newEnd - newStart);
                    // 滚动到底部，剩余位置不足每页数量
                    if( direction == 'down' && diffNum < initAmount ){
                        newStart = newEnd - stepAmount
                    }
                    // 滚动到定部，剩余位置不足每页数量
                    if( direction == 'top' && diffNum < initAmount ){
                        newEnd = newStart + stepAmount
                    }
                    /*
                    if( direction == 'down' && diffNum >= initAmount && diffNum < initAmount * 1.5 ){
                        newStart -= stepAmount;
                        newStart = Math.max(newStart, 0);
                    }
                    */
                    // 待渲染的新数据
                    var newItems = wholeItems.slice(newStart, newEnd);
                    this.start = newStart;
                    this.end = newEnd;
                    if( this.loadAnimation ){
                        // 使用动画时，执行等待动画后渲染
                        clearTimeout(this.setTimeoutFunc);
                        this.toggleLoadingAnim();
                        this.setTimeoutFunc = setTimeout(function(){
                            _this.emitViewport(newItems);
                        }, animationTime)
                    } else{
                        // 使用动画时，直接渲染
                        this.emitViewport(newItems);
                    }
                };

                /**
                 * 监听滚动条滚动时调用事件
                 * @returns {Number}
                 */
                scrollComponent.prototype.refresh = function () {

                    var _this = this;
                    this.isScrollLoop = true;

                    // 判断滚动方向
                    var scrollVal = this.getScrollTop();
                    if( scrollVal < this.prevScrollVal ){
                        this.isScrollUp = true;
                        this.isScrollDown = false;

                    } else {
                        this.isScrollUp = false;
                        this.isScrollDown = true;
                    }
                    this.prevScrollVal = scrollVal;

                    // 计时，用于滚动停止时的后续处理
                    clearInterval(this.intervalFunc);
                    this.intervalFunc = setInterval(function(){
                        clearInterval(_this.intervalFunc);
                        _this.intervalFunc = null;
                        this.isScrollLoop = false;
                        if( _this.isScrollTop() ) {
                            _this.calcItems();
                            _this.reCalcScrollTop();
                        }
                        if( _this.isScrollBottom() ) {
                            _this.calcItems();
                            _this.reCalcScrollBottom();
                        }

                    }, 50);

                    // 滚动过程中计算需要加载的数据
                    return requestAnimationFrame(function () {
                        return _this.calcItems();
                    });

                };

                /**
                 * 渲染的新数据
                 * @param list
                 */
                scrollComponent.prototype.emitViewport = function(list){
                    var _this = this;
                    scope.viewportItems = list;
                    this.isScrollLoop = false;

                    $timeout(function(){
                        // 跳转定位时，顶部预留位置
                        if( _this.isScrollSkip ){
                            _this.reCalcScrollTop();
                            _this.isScrollSkip = false;
                        }
                        // 使用动画时，开启或者关闭加载动画
                        if( _this.loadAnimation ){
                            _this.toggleLoadingAnim();
                        }
                        showDebugHtml();
                    },0);
                };


                /**
                 * 开启或者关闭加载动画
                 */
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
                        // 操纵动画节点
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

                /**
                 * 页面中展示调试信息
                 */
                function showDebugHtml(){
                    var _this = scrollModule;
                    document.getElementById('show').innerHTML = 'total: '+_this.wholeItems.length+' start: '+_this.start+' end: '+_this.end+' diff: '+(_this.end-_this.start);
                }


                /**
                 * 初始化
                 * scrollModule 当前实例
                 */
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
                    $log.debug('ngLazyScrollLoad: ngModel not provided!', element);
                }

                /**
                 * 销毁作用域
                 */
                scope.$on('$destroy', function() {
                    scrollModule.destroyModule();
                });

                /**
                 * 监听"期望定位"的变化，执行跳转
                 */
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
}());
