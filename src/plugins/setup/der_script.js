/**
 * This legacy script is to be ported to TypeScript objects as time permits.  For now, we wrap this
 * old code in new commands.
 */


// module name space
var derScript = {};

derScript.check_flag = function(character_id, attribute_name) {
    var flag = findObjs({ type: 'attribute', characterid: character_id, name: attribute_name }, {})[0];
    if (typeof flag == 'undefined') {
        return false;
    }
    return Number(flag.get('current')) > 0;
};

derScript.error = function(result, text) {
	result.messages.push(`ERROR from legacy code: ${text}`);
};

derScript.status = function(result, text) {
	result.messages.push(text);
};

derScript.darkvision_token = function(result, token, range) {
	// check if vision is already configured
	let radius = Number(token.get('light_radius'));
	let sight = Boolean(token.get('light_hassight'));
	if (sight && (radius > 0)) {
		// already configured
		return;
	}
	// set specified darkvision (always dim)
    token.set({
        light_radius: range,
        light_dimradius: 0,
        light_hassight: true,
        light_otherplayers: false,
        adv_fow_view_distance: range
    });
    derScript.status(result, 'darkvision ' + token.get('name') + ' ' + range + 'ft');
};

derScript.lamp_token = function(result, token, bright_range, dim_range) {
    var total_range = Number(bright_range) + Number(dim_range);
    token.set({
        light_radius: total_range,
        light_dimradius: bright_range,
        light_hassight: true,
        light_otherplayers: true,
        adv_fow_view_distance: total_range
    });
    derScript.status(result, 'lamp ' + token.get('name') + ' ' + bright_range + 'ft, dim to ' + total_range + 'ft');
};

derScript.stat_pc = function(result, token, character_id) {
    var bar1 = token.get('bar1_value');
    var bar2 = token.get('bar2_value');
    var bar3 = token.get('bar3_value');

    var attr_hp = findObjs({ type: 'attribute', characterid: character_id, name: 'hp' }, {})[0];
    if (!attr_hp) {
        derScript.error(result, 'token ' + token.get('name') + ' refers to character without hp');
        return;
    }
    token.set({ bar1_link: attr_hp.id, bar1_value: attr_hp.get('current'), bar1_max: attr_hp.get('max') });

    var attr_passive_wisdom = findObjs({ type: 'attribute', characterid: character_id, name: 'passive_wisdom' }, {})[0];
    if (!attr_passive_wisdom) {
        derScript.error(result, 'token ' + token.get('name') + ' refers to character without passive wisdowm(perception)');
        return;
    }
    token.set({ bar2_link: attr_passive_wisdom.id, bar2_value: attr_passive_wisdom.get('current'), bar2_max: 30 });

    // first name only
    var name = token.get('name').split(/ /)[0];
    token.set({
        name: name,
        showname: true,
        showplayers_name: true
    });

	// this assumes darkvision, XXX actually check the stat if possible
    derScript.darkvision_token(result, token, 60);

    derScript.status(result, 'stat ' + token.get('name') + ' as Player');
    // log(token)
};


derScript.show_state_sizes = function(result) {
    log('saved state is roughly ' + Math.round(JSON.stringify(state).length / 10.24) / 100.0 + ' KB');
    var scripts = _.keys(state);
    _.each(scripts, function(s) {
        log('  script ' + s + ' is using roughly ' + Math.round(JSON.stringify(state[s]).length / 10.24) / 100.0 + ' KB');
    });
};

derScript.dead = function(result) {
    _.each(derScript.get_tokens(result), function(token) {
        if (token.get('isdrawing')) {
            derScript.status(result, 'token ' + token.get('name') + ' is a drawing and will not be killed');
            return;
        }

        // set status, clearing all other status markers
        token.set({ statusmarkers: 'dead' });

        // remove from init tracker
        var turns_text = Campaign().get('turnorder');
        var turns = JSON.parse(turns_text);
        /*
         * [{"id":"-LD7ObXWCk8NYQbCrAuX","pr":15,"custom":""},{"id":"-LD7A66FaB0mLtl5KgAb","pr":14,"custom":""},{"id":"-LD7OcB0v3XB9RBBNMv2","pr":8,"custom":""}]
         */
        var new_turns = turns.filter(function(item) {
            return item.id != token.get('_id');
        });
        Campaign().set({ turnorder: JSON.stringify(new_turns) });
        // REVISIT need to let groupinit know or will it notice?
        // notifyObservers('turnOrderChange',Campaign().get('turnorder'), turns);
    });
};

// XXX replace with initiative_formula and consider initiative_style and poisoning state, plus (initiative_bonus || initiative_mod)
// XXX return tuple of formula and short comment, like (+5A, +3, 0, -1, -2D, ...)
derScript.initiative_bonus = function(result, token, character_id) {
    var attr_initiative_bonus = findObjs({ type: 'attribute', characterid: character_id, name: 'initiative_bonus' }, {})[0];
    if (attr_initiative_bonus) {
        return Number(attr_initiative_bonus.get('current'));
    }
    return 0;
};

derScript.initiative_group = function(result, token, character_id) {
    // each journal entry (player, monster type) is an initiative group, using basic group initiative according to PHB
    return character_id;
};

derScript.initiative = function(result) {
    var grouped = {};
    _.each(derScript.get_tokens(result), function(token) {
        if (token.get('isdrawing')) {
            derScript.status(result, 'token ' + token.get('name') + ' is a drawing and does not get initiative');
            return;
        }
        var character_id = token.get('represents');
        if (!character_id) {
            derScript.status(result, 'token ' + token.get('name') + ' is not linked to a character sheet and will not get initiative');
            return;
        }
        var group = derScript.initiative_group(result, token, character_id);
        var bonus = derScript.initiative_bonus(result, token, character_id);
        if (!grouped[group]) {
            grouped[group] = { bonus: bonus, tokens: new Set() };
        }
        grouped[group].tokens.add(token.id);
    });

    // load current turn order
    var turns_text = Campaign().get('turnorder');
    var turns;
    if (turns_text == undefined || turns_text.length < 1) {
        // this will happen in a fresh room
        turns = [];
    } else {
        turns = JSON.parse(turns_text);
    }

    // update all selected tokens, respecting grouping
    _.each(grouped, function(spec, group_id) {
        // XXX use formula, zero pad to sort correctly even though we add comments
        // XXX clamp to 0, disallow negative result
        var init_roll = randomInteger(20) + spec.bonus;
        // remove from initiative, since we are re-rolling them
        turns = turns.filter(function(turn) {
            return !spec.tokens.has(turn.id);
        });
        // always add at the end, we will sort when new round starts
        turns = turns.concat(
            Array.from(spec.tokens).map(function(id) {
                return { id: id, pr: init_roll };
            })
        );
    });

    // update turn order
    Campaign().set({ turnorder: JSON.stringify(turns) });
};

derScript.initiative_clear = function(result) {
    Campaign().set({ turnorder: '[]', initiativepage: false });
};

derScript.init = function() {
    if (!state.net_derammo_derscript) {
        state.net_derammo_derscript = {};
    }
    if (!state.net_derammo_derscript.positions) {
        state.net_derammo_derscript.positions = {};
    }
};

derScript.get_token = function(token_flat) {
	if (!token_flat) {
		return undefined
	}
	var token = getObj("graphic", token_flat.id);
	if(!token) {
		token = getObj("graphic", token_flat["_id"]);
	}
	return token
}

on('ready', function() {
    derScript.init();
    // derScript.show_state_sizes();
});

on('change:campaign:turnorder', function(campaign, previous) {
    var token_flat = JSON.parse(campaign.get('turnorder'))[0];
    var token = derScript.get_token(token_flat);
    if (!token) {
        return;
    }
    var character_id = token.get('represents');
    if (!character_id) {
        return;
    }
    var character = getObj('character', character_id);
    var text = [];
    const regex = new RegExp(`^repeating_npcaction_(-[-A-Za-z0-9]+?|\\d+)_name`);

    text.push('next turn is for ' + character.get('name'));
    text.push('https://journal.roll20.net/character/' + character_id);
    findObjs({ type: 'attribute', characterid: character_id }).forEach(attribute => {
        var attribute_name = attribute.get('name');
        if (attribute_name.search(regex) === 0) {
            text.push('[' + attribute.get('current') + '](~' + character_id + '|' + attribute_name.slice(0, -5) + '_npc_action)');
        }
    });
    if (text.length > 0) {
        sendChat('derScript', '/w GM ' + text.join(' '), null, { noarchive: true });
    }
});
