export type LifeOutcome = {
    amountLabel: string;
    text: string;
};

const LIFE_OUTCOMES: Record<number, string> = {
    0: "You have not won enough money. You become feral.",
    1: "Ape got ya.",
    2: "You shred your losing tickets to build a cozy nest for your geckos.",
    3: "Your winnings don't add up to much but you fold them over and use them to fix a wiggly table. Nice!",
    4: "Your winnings cover the cost of a coffee. You spill it on a rat who's trying to slurp your shoelace like spaghetti.",
    5: "You treat yourself to a nice stadium dinner of free diced onions and a bottled water.",
    6: "You slip your winnings under the windshield wiper of a random car in the stadium lot to \"pay it forward\" in a confusing way.",
    7: "You buy one share of stock in Mascot Racing League Worldwide Corp. Buy what you know!",
    8: "You've got just enough for a cheap net to capture the mayor's poodle for ransom, and a dollar left over as poodle bait.",
    9: "You sell your winnings on Facebook Marketplace for $8.",
    10: "You leave with the exact same amount of money you started with, go to bed, and wake up in the morning back at the start of the day you just lived. Here we go again!!",
    11: "Thanks to your gambling, you can buy your family some ketchup.",
    12: "You buy a cursed ring. But it's not a big deal curse. It's fine.",
    13: "You sneeze all over your winnings, so now they're gross, so into the trash they go.",
    14: "You're disgusted at yourself for gambling. You go to church and have them hose you down with holy water.",
    15: "At the stadium, you buy your son a Hurley action figure with juice oozing action. The little guy's just crazy about meat juices!",
    16: "You use your winnings on a Frankenstein mask to kickstart your door-to-door Frankenstein business.",
    17: "You ask for your winnings in coins. They weigh you down and you're sucked into a mud puddle forever.",
    18: "Your winnings give you a paper cut so you flush them as revenge.",
    19: "Your winnings make you bold enough to quit your job. Then you count them again. Oops.",
    20: "You're overcome with the irrepressible urge to eat a $20 bill and devour your winnings. The rest of your life is normal.",
    21: "You stash the money in your cheek and it gets moldy.",
    22: "You mail your winnings to your niece, who uses them to buy a sweet butterfly knife to do tricks with.",
    23: "You finally have enough money to fulfill your dream of buying a used copy of Tony Hawk's Downhill Jam for the Xbox 360, so you do it.",
    24: "You get your winnings in nickels and use the weight to explore the bottom of the river, where you find some nickels.",
    25: "You buy a hardcover book about what to do with $25. It says you made the best possible choice. Wow!",
    26: "You buy yourself a modest crown and live out your days as a well respected local regent.",
    27: "You use the money to hire a mercenary to punch your uncle, but your uncle shakes it off like it's nothing.",
    28: "A mugger corners you in the parking lot, and that's how you meet your wife.",
    29: "You throw your winnings onto the field, where you assume the mascots live, because they did such a good job today.",
    30: "Ape tried to get ya, but you paid it off with a cool $30.",
    31: "You get addicted to winning $31 specifically, and your life doesn't get great from there.",
    32: "Your winnings go straight into Gobbler's college fund.",
    33: "You buy a jaunty hat and unlock your dangerous new persona, Jackknife Jones.",
    34: "You fold all the cash you win into little origami boxes to make a bug zoo with.",
    35: "You buy yourself a new boomerang. Someday you will learn to throw them right.",
    36: "You can finally pay off your debt to the kid you borrowed $5 from in sixth grade, with interest.",
    37: "You have won too average an amount of money. You become feral.",
    38: "You get yourself a back alley toupee but a seagull steals it.",
    39: "You buy yourself a shovel, get really into digging big holes, and dig a really big one.",
    40: "You use your winnings to buy a copy of the game Hot Streak, by Jon Perry and CMYK. You enjoy playing it for years with friends and family.",
    41: "You lose all your winnings trying to win a cigarette from a claw machine.",
    42: "You add your winnings to the dowry you plan to give Mum to convince her to marry you. A queen deserves the best!",
    43: "You won enough to pay off a bit of your peanut debt to the peanut girl. To celebrate, you borrow some more peanuts.",
    44: "You donate your winnings to NASA. You believe in what they're doing.",
    45: "You have enough to buy yourself a single mascot glove. Soon, you will be the mascot.",
    46: "You invest your winnings in hog futures and triple them thanks to an outbreak of Good For Hogs Disease.",
    47: "It's actually illegal to have $47. You are sent into exile.",
    48: "A t-shirt cannon t-shirt is shot directly into your mouth, cursing you with an insatiable hunger for high velocity shirts.",
    49: "You book studio time to record your soon-to-be smash hit, \"I Saw What I'm Pretty Sure Was A Hot Dog Run Around.\"",
    50: "Since $50 is objectively the coolest amount of money, you become wildly popular, with many girlfriends and/or boyfriends.",
    51: "You are caught in a net and pulled into the sky and never seen again.",
    52: "You buy a wishing coin from a curio shop and have one magical summer before you accidentally wish yourself into being a zoo koala.",
    53: "You rub your winnings all over you to have that coveted Money Smell. It attracts wolves.",
    54: "You throw all your winnings in the air to impress your son, but they never come down.",
    55: "You put it all into scratch-offs and win $53.",
    56: "On your way out of the stadium, you leave such a big tip for the peanut girl she becomes the first member of your cult.",
    57: "You bring your winnings to an old weaver-woman, who crafts them into a fine cloak of good fortune that all will envy. And don't you look handsome in it!",
    58: "You re-invest your winnings in bribing Gobbler to take a dive in next week's race. Unfortunately Gobbler has too much integrity and snitches to the Council of Mascots. Now you are hunted.",
    59: "You get yourself some rope. You can never have too much rope!",
    60: "You're able to buy a week's worth of meatball subs. And what a week it is!",
    61: "The money goes straight into your legal defense fund for having shaved \"ASS\" into the haunch of the mayor's poodle.",
    62: "A family of robins make a nest in your winnings. They become your lifelong companions.",
    63: "Unfortunately your winnings are seized by the Gaming Commission when it turns out all the mascots were wearing performance-enhancing goofy oversized shoes.",
    64: "You buy one therapy session, where you finally, tearfully accept that your parents were annoying.",
    65: "With this big win, you can finally pay your parking bill and leave the stadium, after five months of trying.",
    66: "Nice!",
    67: "You donate to the mayor's re-election campaign to get back on her good side. But her poodle will never forgive you for calling it a \"bug type creature.\"",
    68: "You treat yourself to some Luxury Corn.",
    69: "You finally have enough funds to build a big ramp in your driveway to jump your car over your house.",
    70: "You take your family out to a celebratory dinner, one thing leads to another, and now you've got a whole Batman thing going on.",
    71: "You go broke after dumping your newfound wealth into a rich guy top hat.",
    72: "Nice spaghetti dinner :)",
    73: "To prove you're not a loser, you spend the next five years getting really shredded so you can throw Dangle into the ocean.",
    74: "You can finally afford to get your dog a silk bowtie so he's taken seriously in his workplace.",
    75: "You slide your winnings under the door of a defunct Red Lobster and are rewarded with a cheddar biscuit on your doorstep every morning for the rest of your life.",
    76: "You mail your winnings to Jon Bon Jovi. He's earned 'em!",
    77: "You're kickin' it to this day.",
    78: "You drop your winnings on your way home and they're dragged into a hole by a very strong beetle. Well, easy come easy go.",
    79: "You commission a portrait of yourself but when it's done everyone likes it more than you.",
    80: "Pizza party.",
    81: "Pizza party with a premium topping.",
    82: "Money changes you. You grow a few inches.",
    83: "Money changes you. You look identical to the guy on the dollar now.",
    84: "Your winnings only serve to fuel your crippling addiction to bun bangers and luxury condiments.",
    85: "An angel descends from heaven and offers you a one-time $86 flash discount on a seat in heaven. But you're a dollar short. Was it a scam? You'll never know!",
    86: "You lose your winnings to a scam by an angel who promises you a seat in heaven for $86. You don't realize you've been scammed til you die.",
    87: "You slip security your winnings so they'll let you party with the mascots. Unfortunately, it turns out those are just costumes.",
    88: "You found your own rival mascot league race. Sure, you can only afford one mascot, but it goes on an unbelievable winning streak.",
    89: "You buy a controlling share of stock in Mascot Racing League Worldwide Corp and force the board to add you as a mascot.",
    90: "You blow all your winnings on one hour of college tuition, and learn all about the humble newt.",
    91: "You're able to bid enough at a silent auction to win a date with Mum, but honestly, you both have to admit there's no chemistry.",
    92: "You donate enough to get a plaque with your name installed on Hurley's stomach.",
    93: "Everyone at the stadium is going crazy for how big you won. They crowdsurf you down onto the field and you're immediately removed by security and banned for life.",
    94: "You give a dollar to every one of the ninety four fairies who blessed you with a little bit of luck so they will finally leave you alone and stop swarming around your head.",
    95: "You pay some contractors to dig a tunnel between the stadium and your home so you can come bet on mascot races even when it's kinda rainy out.",
    96: "You can finally buy the hat at the merch booth that says I WON $96 BETTING ON MASCOT RACES AND ALL I GOT WAS THIS HAT THAT COSTS $96 BECAUSE IT'S MADE OF SUCH QUALITY MATERIALS.",
    97: "A statue of you throwing money in the air is added to the Big Winner's Row outside the stadium. Someone vandalizes it with a surprisingly tasteful mustache.",
    98: "You treat yourself by ordering a rare imported ape and letting it loose in town, for the drama of it all.",
    99: "You are terrified you've used up all your luck at once and stay under your bed for the rest of your life."
};

export function getLifeOutcome(
    money: number
): LifeOutcome {
    const normalizedMoney = Math.max(
        0,
        Math.floor(money)
    );

    if (normalizedMoney >= 100) {
        return {
            amountLabel: "$100+",
            text: "You have won too much money. You become feral."
        };
    }

    return {
        amountLabel: `$${normalizedMoney}`,
        text:
            LIFE_OUTCOMES[normalizedMoney] ??
            "No life outcome was found."
    };
}