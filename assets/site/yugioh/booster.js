const cardTemplate = (
    '<div class="card">' +
        '<img alt="{{name}}" src="/yugioh/card/{{code}}" />' +
    '</div>'
)
const flipCardTemplate = (
    '<div class="flip-card {{rarity}}">' +
        '<div class="flip-card-inner card">' +
            '<div class="flip-card-front">' +
                '<div class="flip-card_effect"></div>' +
                '<img alt="Back of Card" src="/yugioh/card/BACK" />' +
            '</div>' +
            '<div class="flip-card-back">' +
                '<div class="flip-card_effect"></div>' +
                '<img alt="{{name}}" src="/yugioh/card/{{code}}" />' +
            '</div>' +
        '</div>' +
    '</div>'
)
const booster_code = window.location.pathname.split('/').pop()

$('.booster_pack a').on('click', function(e) {
    e.preventDefault();
    $('.booster_pack').css('top', '-700px')
    setTimeout( function(){
        $('.booster_pack').css("display", "none");
        $('.booster').css("opacity", "1");
    },1000);
    openBooster();
})

function openBooster() {
    $.ajax({
        url: '/yugioh/open/' + booster_code,
        type: "GET",
        data: {},
        success: function (data) {
            renderCards('.cards', data.booster)
        },
        error: function (error) {
            $('#message p').html('This card pack has already been opened or the code is invalid!')
        }
    })
}

function renderCards(selector, cards) {
    $(selector).html(
        Mustache.render(
            '{{#.}}' +
                flipCardTemplate +
            '{{/.}}'
        , cards)
    )

    $('.flip-card').on('click', function(e) {
        $(this).addClass('flip');
    })
}

async function checkCode(code) {
    let valid = false
    await $.ajax({
        url: '/yugioh/check-code/' + code,
        type: "GET",
        data: {},
        success: function (data) {
            valid = data.valid
        }
    })
    return valid
}

async function start() {
    let valid = await checkCode(booster_code)
    console.log(valid)
    if(valid) {
        setTimeout( function(){
            $('.booster_pack').css('top', 20)
            $('.booster_pack').css('position', 'relative')
        },1000);
    }
    else {
        $('#message p').html('This card pack has already been opened or the code is invalid!')
    }
}

start()