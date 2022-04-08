$(window).load(function() {
    $.tablesorter.addParser({
        id: 'date',
        is: function(s) {
            return false;
        },
        format: function(s) {
            if (s == "-") {
                return '99999999999999';
            } else {
                return s.toLowerCase().replace(/[^0-9]/g, '');
            }
        },
        type: 'string'
    });
});
