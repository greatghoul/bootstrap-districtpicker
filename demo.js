$(function() {
    $('#cityName').citypicker({data: data, 
        callback: function(city) {
            $(this).nextAll('.help-inline').html('城市名称：' + city.name 
            + '&nbsp;&nbsp;城市代码：' + city.code);
        },
        dataHandler: function(data) {
            return $.map(data, function(city) {
                return $.extend({ hot:Math.random() > 0.7 }, city); 
            });
        }
    }); 
});
