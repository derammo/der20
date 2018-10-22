export abstract class ConfigurationPersistence {
    static supported() : boolean {
        return false;
    }
    abstract load(): object;
    abstract save(configuration: object);
}