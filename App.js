import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import {RootStack} from "./src/navigation/RootStack";
import { HistoryProvider} from "./src/Utils/HistoryContext";

export default function App() {
    return (
        <HistoryProvider>
        <NavigationContainer>
            <RootStack />
        </NavigationContainer>
        </HistoryProvider>
    );
}
