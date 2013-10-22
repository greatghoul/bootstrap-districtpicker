!function($) {
    var CityPicker = function(element, options) {
        this.options = $.extend($.fn.citypicker.defaults, options);
        
        this.$element = $(element);
        this.$element.on('click', $.proxy(this.show, this));
        this.$element.on('focus', $.proxy(this.show, this));
        this.$element.on('blur',  $.proxy(this.hide, this));
        
        init.call(this);
    };

    /**
     * 根据拼音，获取所在的分组
     *
     * 分组包括 ABCDEFG | HIJKLMN | OPQRST | UVWXYZ
     *
     * @param {string} pinyin 城市的拼音编码
     * @return {string} 分组的名称
     */
    function getGroupName(pinyin) {
        // 取小写形式的首字母
        var firstChar = pinyin.charAt(0).toLowerCase();
        var groupNameTable = '|abcdefg|hijklmn|opqrst|uvwxyz|';
        var pattern = new RegExp('\\|([^\\|]*' + firstChar + '[^\\|]*)\\|', 'g');
        pattern.exec(groupNameTable);
        return RegExp.$1;
    }
    
    CityPicker.prototype = {
        constructor: CityPicker,
        update: function(data) {
            this.request && this.request.abort();
            // 如果提供的是url，则通过ajax载入数据
            if (typeof data == 'string') {
                this.options.url = data;
                this.request = $.getJSON(data, this.options.params, $.proxy(this.update, this));
                return;
            } 
            
            // 如果自定义了数据加工方法，则使用该方法加工数据为符合规则的列表形式
            // [
            //   { name: 'name', code: 'code', pinyin: 'pinyin', hot: false},
            //   { name: 'name1', code: 'code1', pinyin: 'pinyin1', hot: true},
            //   ...
            // ]
            this.options.data = data;
            var dataHandler = this.options.dataHandler;
            this.data = dataHandler ? dataHandler.call(this, data) : this.options.data;
            // 将城市列表按热度和拼音首分组进行分组
            var groups = groupCities(this.data);
            // 将数据装填到控件中
            fill.call(this, groups);
            
            // 设置热门城市的可见性
            this.$widget.find('.city-group-hot').toggle(this.options.showHot);
            this.$widget.find('.nav li a[data-target=hot]').parent().toggle(this.options.showHot);
            this.options.showHot || this.$widget.find('.nav li a[data-target=abcdefg]').trigger('click');
        },

        showTab: function(evt) {
            evt.stopPropagation();
            evt.preventDefault();
            
            var group = $(evt.target).data('target');

            // switch navs
            this.$widget.find('.nav li.active').removeClass('active');
            this.$widget.find('.nav li a[data-target=' + group + ']').parent().addClass('active');
            this.$widget.find('.city-groups .city-group').hide();
            this.$widget.find('.city-groups .city-group-' + group).show();
        },
        select: function(evt) {
            evt.stopPropagation();
            evt.preventDefault();
            
            var city = $(evt.target).data();
            this.$element.val(city.name);
            this.$element.next('input[type=hidden]').val(city.code);
            this.options.callback.call(this.$element, city);
            this.ignoreBlur = false;
            this.hide();
        },
        show: function(e) {
            e.stopPropagation();
            e.preventDefault();
           
            // 计算浮动层的位置
            var pos = $.extend({}, this.$element.offset(), {
                height: this.$element[0].offsetHeight
            });
            this.$widget.css({
                top: pos.top + pos.height,
                left: pos.left
            });

            // 高亮显示选中的城市
            var cityCode = this.$element.next('input[type=hidden]').val();
            this.$widget.find('.city.selected').removeClass('selected');
            this.$widget.find('.city-' + cityCode).addClass('selected');
            this.$widget.show();
            $('html').on('click.citypicker.data-api', $.proxy(this.hide, this));
        },
        hide: function(e) {
            if (this.ignoreBlur) {
                this.ignoreBlur = false;
                return;
            }; 
            this.$widget.hide();
            $('html').off('click.citypicker.data-api', $.proxy(this.hide, this));
        },
        mousedown: function() {
            this.ignoreBlur = true;
        }
    };

    // == CityPicker Private Methods ==
    
    // 初始化控件，构造控件的结构并获取数据
    function init() {
        var $this = this;
        this.$widget = $(this.options.tpls.dropdown).appendTo('body');
        this.$widget.on('mousedown',  $.proxy(this.mousedown, this));
    
        this.$widget.on('click.data-api', '[data-action=select]', $.proxy(this.select, this));
        this.$widget.on('click.data-api', '[data-action=showTab]', $.proxy(this.showTab, this));
    
        // 载入数据，如果直接提供了数据，则不需要通过ajax载入数据
        this.update.call(this, this.options.data || this.options.url);
    }

    // 将分组后的数据装填到控件中
    function fill(groups) {
        var $this = this;

        // 清空各分组标签页中的内容
        this.$widget.find('.city-groups .city-group').empty();
        
        // 将数据填充到各自的分组中
        $.each(groups, function(group, cities) {
            var html = $.map(cities, function(city) {
                return fmt($this.options.tpls.city, city);
            }).join(''); 
            $(html).appendTo($this.$widget.find('.city-groups .city-group-' + group));
        });
    }

    // 将城市列表按pinyin, 及热度分组
    function groupCities(data) {
        var groups = { 'hot': [], 'abcdefg': [], 'hijklmn': [], 'opqrst': [], 'uvwxyz': [] };
        // 全部城市按拼音分组
        $.each(data, function(index, city) {
            // 捡出热门城市独立分组
            if (city.hot) {
                groups['hot'].push(city);
            }
            
            // 将城市按拼音分组成四个段 
            var group = getGroupName(city.pinyin);
            groups[group].push(city);
        });

        return groups;
    }
  
    // == Global Private Methods ==

    // 格式化字符串
    // 
    // 用法：
    // 
    // var s1 = 'I like %{1} and %{2}!';
    // console.log('source: ' + s1);
    // console.log('target: ' + fmt(s1, 'ask', 'learn'));
    // 
    // var s2 = "%{name} is %{age} years old, his son's name is %{sons[0].name}";
    // console.log('source: ' + s2);
    // console.log('target: ' + fmt(s2, { name: 'Lao Ming', age: 32, sons: [{ name: 'Xiao Ming', age: 12}]}));
    function fmt() {
        var args = arguments;
        return args[0].replace(/%\{(.*?)}/g, function(match, prop) {
            return function(obj, props) {
                var prop = /\d+/.test(props[0]) ? parseInt(props[0]) : props[0];
                if (props.length > 1) {
                    return arguments.callee(obj[prop], props.slice(1));
                } else {
                    return obj[prop];
                }
            }(typeof args[1] == 'object' ? args[1] : args, prop.split(/\.|\[|\]\[|\]\./));
        });
    }

    // 城市选择器jQuery接口定义
    //
    // 参数定义：
    // =======================
    // url          {string}   通过ajax请求获取城市数据
    // data         {array}    直接使用提供的原始数据 (如果提供了data，则忽略url)
    // showHot      {booleaan} 是否显示热门城市
    // params       {object}   提交给ajax的参数
    // dataHandler  {function} 对数据进行二次加工 参数：data
    // callback     {function} 当选择了一个城市后执行的回调函数 参数：city
    $.fn.citypicker = function(option) {
        return this.each(function () {
            var $this = $(this);
            var citypicker = $this.data('citypicker');
            var options = $.extend({}, $this.data(), typeof option == 'object' && option);
            if (!citypicker) $this.data('citypicker', (citypicker = new CityPicker(this, options)));
            if (typeof option == 'string') citypicker[option].apply($this, Array.prototype.slice.call(arguments, 1));
        });
    };
    
    // 默认参数定义
    $.fn.citypicker.defaults = {
        showHot: true, // 是否显示热门城市, 默认显示,
        params: {},
        tpls: {
            dropdown: ''
                + '<div class="bootstrap-citypicker hide">'
                + '  <div class="help-inline" style="color: #ccc">可直接输入城市或拼音查询</div>'
                + '  <ul class="nav nav-pills">'
                + '    <li class="active nav-hot"><a href="# "data-action="showTab" data-target="hot">热门城市</a></li>'
                + '    <li><a href="#" data-action="showTab" data-target="abcdefg">ABCDEFG</a></li>'
                + '    <li><a href="#" data-action="showTab" data-target="hijklmn">HIJKLMN</a></li>'
                + '    <li><a href="#" data-action="showTab" data-target="opqrst">OPQRST</a></li>'
                + '    <li><a href="#" data-action="showTab" data-target="uvwxyz">UVWXYZ</a></li>'
                + '  </ul>'
                + '  <div class="container-fluid city-groups">'
                + '    <ul class="unstyled city-group city-group-hot"></ul>'
                + '    <ul class="unstyled city-group city-group-abcdefg hide"></ul>'
                + '    <ul class="unstyled city-group city-group-hijklmn hide"></ul>'
                + '    <ul class="unstyled city-group city-group-opqrst hide"></ul>'
                + '    <ul class="unstyled city-group city-group-uvwxyz hide"></ul>'
                + '  </div>'
                + '</div>',
            city: ''
                + '<li class="city city-%{code}">'
                + '  <a href="#" title="%{name}" data-action="select" '
                + '     data-name="%{name}" data-code="%{code}">%{name}</a></li>'
        }
    };

    $.fn.citypicker.Constructor = CityPicker;
}(window.jQuery);
