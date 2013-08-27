/**
 * @author Nguyen Huu Phuoc <huuphuoc.me>
 * @copyright (c) 2013 Nguyen Huu Phuoc
 *
 * Follow me on Twitter (@nghuuphuoc)
 */

angular
    .module('ResponsiveTest', [])
    .directive('rtDevice', function($compile) {
        return {
            restrict: 'EA',
            replace: true,
            scope: {
                brands: '='
            },
            // templateUrl: 'app/views/device.html',
            link: function($scope, $element, $attrs) {
                var template = '<ul class="dropdown-menu">', brands = $scope.brands, numBrands = brands.length;

                $scope.openStatus     = new Array(numBrands);
                $scope.openStatus[0]  = true;
                $scope.lastHoverBrand = 0;

                $scope.toggleBrand = function(i) {
                    $scope.openStatus[i] = true;
                    if (i != $scope.lastHoverBrand) {
                        $scope.openStatus[$scope.lastHoverBrand] = false;
                        $scope.lastHoverBrand = i;
                    }
                };

                // TODO: Move this to template
                for (var i = 0; i < numBrands; i++) {
                    if (i > 0) {
                        template += '<li class="divider"></li>';
                    }
                    template += '<li class="dropdown-header" ng-mouseover="toggleBrand(' + i + ')">' + brands[i].name + '</li>';
                    for (var j in brands[i].devices) {
                        template += '<li ng-show="openStatus[' + i + ']"><a href="javascript: void(0);" ng-click="$parent.resizeTo(' + brands[i].devices[j].w + ', ' + brands[i].devices[j].h  + ', ' + brands[i].devices[j].pxd + ')">' + brands[i].devices[j].name;

                        if (brands[i].devices[j].inch) {
                            template += ' <small></small><span>' + brands[i].devices[j].inch + '"</span>';
                        }
                        template += '</a></li>';
                    }
                }
                template += '</ul>';

                var newElement = angular.element(template);
                $compile(newElement)($scope);
                $element.replaceWith(newElement);
            }
        }
    })
    .directive('rtResizable', function() {
        return {
            restrict: 'A',
            link: function($scope, $element, $attrs) {
                var parent = $scope.$parent;
                $element.resizable({
                    resize: function(event, ui) {
                        $scope.w = ui.size.width * $scope.pxd;
                        $scope.h = ui.size.height * $scope.pxd;
                        parent.$apply();
                    }
                });
            }
        }
    })
    .directive('rtKeyup', function() {
        // Handle the onKeyUp event
        // Store the URL when user press the Enter key
        return function(scope, element, attrs) {
            var keyupHandler = scope.$eval(attrs.rtKeyup);
            element.bind('keyup', function(evt) {
                scope.$apply(function() {
                    keyupHandler(evt.which);
                });
            });
        }
    })
    .config(function($httpProvider) {
        var numLoadings = 0;
        var loadingScreen = $('<div style="position: fixed; top: 0; left: 0; z-index: 1000; width: 100%; height: 100%;"><div style="position: absolute; top: 50%; left: 0; width: 100%;"><div class="row"><div class="col-lg-6 col-offset-3"><div class="progress progress-striped active"><div class="progress-bar" style="width: 100%;"></div></div></div></div></div></div>').appendTo($('body')).hide();
        $httpProvider.responseInterceptors.push(function() {
            return function(promise) {
                numLoadings++;
                loadingScreen.show();
                var hide = function(r) {
                    if (!(--numLoadings)) {
                        loadingScreen.hide();
                    }
                    return r;
                };
                return promise.then(hide, hide);
            };
        });
    })
    .controller('IndexController', function($rootScope, $scope, $http) {
        $scope.loading  = true;
        $scope.w        = 1024;
        $scope.h        = 768;
        $scope.pxd      = 1;
        $scope.url      = null;
        $scope.frameSrc = null;

        /**
         * Init the controller
         */
        $scope.init = function() {
            $http.get('data/devices.json').success(function(response) {
                $scope.SUPPORTED_DEVICES = response.supportedDevices;

                // Extract the URL and size from location hash if they are available
                if (window.location.hash && '#u=' == window.location.hash.substr(0, 3)) {
                    var query = window.location.hash.substring(3);
                    if (query.indexOf('|') == -1) {
                        $scope.url = query;
                    } else {
                        var array  = query.split('|');
                        $scope.url = array[0];
                        $scope.w   = array[1];
                        $scope.h   = array[2];
                        $scope.pxd = array[3];
                    }
                } else {
                    // Get the random URL
                    $scope.url = response.randomUrls[Math.floor(Math.random() * response.randomUrls.length)];
                }

                if ($scope.url) {
                    $scope.frameSrc = $scope.normalizeUrl($scope.url);
                }
                $scope.loading  = false;
            });

            $scope.$watch('w + h + url', function() {
                $scope.updateHash();
            });
        };

        /**
         * Rotate the layout
         */
        $scope.rotate = function() {
            if ($scope.w && $scope.h) {
                var tmp = $scope.w;
                $scope.w = $scope.h;
                $scope.h = tmp;
            }
        };

        /**
         * Switch to given size
         * @param {int} width
         * @param {int} height
         */
        $scope.resizeTo = function(width, height, pxd) {
            $scope.w = width;
            $scope.h = height;
            $scope.pxd = pxd;
        };

        /**
         * Handle the keyup event of URL field
         * @param {int} key The key code
         */
        $scope.onKeyup = function(key) {
            if (key == 13) {
                $scope.frameSrc = $scope.normalizeUrl($scope.url);
            }
        };

        /**
         * Make a screen shot for current URL
         */
        $scope.capture = function(evt) {
            if (angular.isNumber($scope.w) && angular.isNumber($scope.h) && $scope.url) {
                // Submit form
                var form = evt.target.form;
                form.submit();
            }
        };

        /**
         * Normalize input URL
         * @param {String} url
         * @return {String}
         */
        $scope.normalizeUrl = function(url) {
            if (url && 'http://' == url.substr(0, 7) || 'https://' == url.substr(0, 8)) {
                return url;
            } else {
                return 'http://' + url;
            }
        };

        // --- Private methods ---

        /**
         * Update the location hash when any one of URL, width, height are changed
         */
        $scope.updateHash = function() {
            if ($scope.w && $scope.h && $scope.url) {
                // Update the location hash
                window.location.hash = '#u=' + [$scope.url, $scope.w, $scope.h, $scope.pxd].join('|');
            }
        };
    });
